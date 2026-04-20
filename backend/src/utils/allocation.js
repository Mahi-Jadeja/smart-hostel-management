import crypto from 'crypto';
import HostelConfig from '../models/HostelConfig.js';
import Room from '../models/Room.js';
import Student from '../models/Student.js';
import AppError from './AppError.js';
import { BRANCHES, STUDENT_GENDERS } from '../constants/enums.js';

/**
 * Create a random seed string.
 *
 * This seed is returned by preview and must be sent back on execute.
 * That keeps allocation deterministic between preview and execute.
 */
export const createAllocationSeed = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Convert a string into a numeric seed.
 */
const stringToSeed = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash || 1;
};

/**
 * Small seeded random number generator.
 */
const mulberry32 = (seed) => {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Shuffle array deterministically using a seed.
 */
const shuffleWithSeed = (items, seedValue) => {
  const result = [...items];
  const random = mulberry32(stringToSeed(seedValue));

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

/**
 * Normalize selected blocks:
 * - trim
 * - uppercase
 * - remove duplicates
 */
const normalizeSelectedBlocks = (blocks = []) => {
  return [...new Set(blocks.map((block) => block.trim().toUpperCase()))];
};

/**
 * Check whether a student is already allocated.
 */
const isAllocated = (student) => {
  return Boolean(student.room_no && student.hostel_block);
};

/**
 * Sort rooms in the required order:
 * 1. block alphabetical
 * 2. lower floor first
 * 3. lower room number first
 */
const sortRooms = (a, b) => {
  const blockCompare = a.hostel_block.localeCompare(b.hostel_block);
  if (blockCompare !== 0) return blockCompare;

  if (a.floor !== b.floor) {
    return a.floor - b.floor;
  }

  return a.room_no.localeCompare(b.room_no, undefined, { numeric: true });
};

/**
 * Stable student sort used for deterministic group processing.
 */
const sortStudents = (a, b) => {
  const genderOrder =
    STUDENT_GENDERS.indexOf(a.gender) - STUDENT_GENDERS.indexOf(b.gender);
  if (genderOrder !== 0) return genderOrder;

  if ((a.year || 0) !== (b.year || 0)) {
    return (a.year || 0) - (b.year || 0);
  }

  const branchCompare = (a.branch || '').localeCompare(b.branch || '');
  if (branchCompare !== 0) return branchCompare;

  const nameCompare = (a.name || '').localeCompare(b.name || '');
  if (nameCompare !== 0) return nameCompare;

  return a.student_id.localeCompare(b.student_id);
};

/**
 * Get the next free bed number inside a room snapshot.
 */
const getNextAvailableBedNo = (room) => {
  const occupiedBeds = new Set(
    room.occupants.map((occupant) => occupant.bed_no).filter(Boolean)
  );

  for (let bedNo = 1; bedNo <= room.capacity; bedNo++) {
    if (!occupiedBeds.has(bedNo)) {
      return bedNo;
    }
  }

  return null;
};

/**
 * Compute simulated room status.
 */
const getSimulatedRoomStatus = (room) => {
  if (room.status === 'maintenance') {
    return 'maintenance';
  }

  if (room.occupants.length === 0) {
    return 'empty';
  }

  if (room.occupants.length >= room.capacity) {
    return 'full';
  }

  return 'partial';
};

/**
 * Convert Room document into plain simulation snapshot.
 */
const buildRoomSnapshot = (room) => ({
  room_id: room._id.toString(),
  room_no: room.room_no,
  hostel_block: room.hostel_block,
  floor: room.floor,
  capacity: room.capacity,
  status: room.status,
  occupants: room.students.map((student) => ({
    student_id: student._id.toString(),
    bed_no: student.bed_no ?? null,
    gender: student.gender || '',
    branch: student.branch || '',
    year: student.year || null,
  })),
});

/**
 * Convert Student document into lightweight simulation object.
 */
const buildStudentSnapshot = (student) => ({
  student_id: student._id.toString(),
  name: student.name,
  email: student.email,
  gender: student.gender,
  branch: student.branch,
  year: student.year,
  current_room_no: student.room_no || '',
  current_block: student.hostel_block || '',
  preferred_roommate_id:
    student.room_preference?.preferred_roommate?.toString() || null,
});

/**
 * Load hostel configs for the target scope.
 */
const loadConfigMap = async (selectedBlocks = []) => {
  const filter =
    selectedBlocks.length > 0
      ? { hostel_block: { $in: selectedBlocks } }
      : {};

  const configs = await HostelConfig.find(filter).sort({ hostel_block: 1 });

  if (!configs.length) {
    throw new AppError('No hostel blocks are configured for bulk allocation', 400);
  }

  if (selectedBlocks.length > 0) {
    const foundBlocks = new Set(configs.map((config) => config.hostel_block));
    const missingBlocks = selectedBlocks.filter(
      (block) => !foundBlocks.has(block)
    );

    if (missingBlocks.length > 0) {
      throw new AppError(
        `Hostel config not found for block(s): ${missingBlocks.join(', ')}`,
        404
      );
    }
  }

  return new Map(configs.map((config) => [config.hostel_block, config]));
};

/**
 * Load room snapshots for target blocks.
 */
const loadRoomSnapshots = async (targetBlocks) => {
  const rooms = await Room.find({
    hostel_block: { $in: targetBlocks },
  })
    .populate('students', 'bed_no gender branch year')
    .sort({ hostel_block: 1, floor: 1, room_no: 1 });

  return rooms.map(buildRoomSnapshot);
};

/**
 * Get candidate students and skipped students for the chosen scope.
 *
 * Scope rules:
 * - unallocated:
 *     only unallocated students
 *
 * - reshuffle_selected_blocks (Option S2):
 *     1. students already allocated in selected blocks
 *     2. PLUS unallocated students whose gender matches selected block genders
 *
 * - reshuffle_all:
 *     all eligible students
 */
const getCandidateStudents = async ({ scope, selectedBlocks, configMap }) => {
  const students = await Student.find({
    is_active: true,
    is_hosteller: true,
  }).sort({ name: 1 });

  const candidates = [];
  const skipped = [];

  const selectedBlockGenderSet = new Set(
    [...configMap.values()].map((config) => config.block_gender)
  );

  for (const student of students) {
    const hasValidGender = STUDENT_GENDERS.includes(student.gender);
    const hasValidBranch = BRANCHES.includes(student.branch);

    if (!hasValidGender || !hasValidBranch) {
      skipped.push({
        student_id: student._id.toString(),
        name: student.name,
        reason: 'Missing required standardized gender or branch data',
      });
      continue;
    }

    const allocated = isAllocated(student);

    if (scope === 'unallocated') {
      if (allocated) {
        skipped.push({
          student_id: student._id.toString(),
          name: student.name,
          reason: 'Already allocated and not included in unallocated scope',
        });
      } else {
        candidates.push(student);
      }
      continue;
    }

    if (scope === 'reshuffle_selected_blocks') {
      if (allocated && selectedBlocks.includes(student.hostel_block)) {
        candidates.push(student);
        continue;
      }

      if (!allocated && selectedBlockGenderSet.has(student.gender)) {
        candidates.push(student);
        continue;
      }

      skipped.push({
        student_id: student._id.toString(),
        name: student.name,
        reason: allocated
          ? 'Allocated outside selected blocks'
          : 'Unallocated student gender does not match selected block genders',
      });

      continue;
    }

    // reshuffle_all
    candidates.push(student);
  }

  return { candidates, skipped };
};

/**
 * Remove candidate students from room snapshots for reshuffle scopes.
 *
 * For unallocated scope, existing room occupants stay in place.
 */
const prepareRoomsForScope = ({ rooms, candidates, scope }) => {
  if (scope === 'unallocated') {
    return rooms.map((room) => ({
      ...room,
      occupants: [...room.occupants],
    }));
  }

  const candidateIds = new Set(
    candidates.map((student) => student._id.toString())
  );

  return rooms.map((room) => ({
    ...room,
    occupants: room.occupants.filter(
      (occupant) => !candidateIds.has(occupant.student_id)
    ),
  }));
};

/**
 * Get free beds count in a room snapshot.
 */
const getAvailableBedsCount = (room) => room.capacity - room.occupants.length;

/**
 * Check whether a room can accept a student under the given constraints.
 */
const canUseRoomForStudent = ({
  room,
  student,
  configMap,
  minFreeBeds = 1,
  occupantMatcher = null,
}) => {
  const blockConfig = configMap.get(room.hostel_block);

  if (!blockConfig) return false;
  if (room.status === 'maintenance') return false;
  if (blockConfig.block_gender !== student.gender) return false;
  if (getAvailableBedsCount(room) < minFreeBeds) return false;

  if (occupantMatcher && room.occupants.length > 0) {
    const occupantsMatch = room.occupants.every((occupant) =>
      occupantMatcher(occupant, student)
    );

    if (!occupantsMatch) return false;
  }

  return true;
};

/**
 * Find first compatible room in sorted order.
 */
const findFirstCompatibleRoom = ({
  rooms,
  student,
  configMap,
  minFreeBeds = 1,
  occupantMatcher = null,
}) => {
  return rooms.find((room) =>
    canUseRoomForStudent({
      room,
      student,
      configMap,
      minFreeBeds,
      occupantMatcher,
    })
  );
};

/**
 * Assign one student into a room snapshot.
 */
const assignStudentToRoomSnapshot = ({ room, student, stage }) => {
  const bedNo = getNextAvailableBedNo(room);

  if (!bedNo) return null;

  room.occupants.push({
    student_id: student.student_id,
    bed_no: bedNo,
    gender: student.gender,
    branch: student.branch,
    year: student.year,
  });

  return {
    student_id: student.student_id,
    name: student.name,
    gender: student.gender,
    branch: student.branch,
    year: student.year,
    room_id: room.room_id,
    room_no: room.room_no,
    hostel_block: room.hostel_block,
    floor: room.floor,
    bed_no: bedNo,
    allocation_stage: stage,
  };
};

/**
 * Allocate students sequentially using a stage-specific room rule.
 */
const allocateStudentsSequentially = ({
  students,
  rooms,
  configMap,
  stage,
  occupantMatcher = null,
}) => {
  const allocations = [];
  const unallocatedStudents = [];

  for (const student of students) {
    const compatibleRoom = findFirstCompatibleRoom({
      rooms,
      student,
      configMap,
      minFreeBeds: 1,
      occupantMatcher,
    });

    if (!compatibleRoom) {
      unallocatedStudents.push(student);
      continue;
    }

    const allocation = assignStudentToRoomSnapshot({
      room: compatibleRoom,
      student,
      stage,
    });

    if (!allocation) {
      unallocatedStudents.push(student);
      continue;
    }

    allocations.push(allocation);
  }

  return { allocations, unallocatedStudents };
};

/**
 * Extract clean mutual roommate pairs.
 *
 * Only A<->B mutual selections are honored.
 */
const extractMutualPairs = (students) => {
  const studentMap = new Map(students.map((student) => [student.student_id, student]));
  const pairedIds = new Set();
  const orderedStudents = [...students].sort(sortStudents);

  const pairs = [];

  for (const student of orderedStudents) {
    if (pairedIds.has(student.student_id)) continue;

    const partnerId = student.preferred_roommate_id;
    if (!partnerId) continue;

    const partner = studentMap.get(partnerId);
    if (!partner) continue;
    if (pairedIds.has(partner.student_id)) continue;
    if (partner.student_id === student.student_id) continue;

    const isMutual = partner.preferred_roommate_id === student.student_id;

    if (!isMutual) continue;
    if (partner.gender !== student.gender) continue;

    pairedIds.add(student.student_id);
    pairedIds.add(partner.student_id);

    const sortedPair = [student, partner].sort(sortStudents);
    pairs.push(sortedPair);
  }

  const remainingStudents = orderedStudents.filter(
    (student) => !pairedIds.has(student.student_id)
  );

  pairs.sort((pairA, pairB) => sortStudents(pairA[0], pairB[0]));

  return { pairs, remainingStudents };
};

/**
 * Allocate mutual preference pairs first.
 */
const allocateMutualPairs = ({ pairs, rooms, configMap }) => {
  const allocations = [];
  const fallbackStudents = [];
  let honoredPairsCount = 0;

  for (const pair of pairs) {
    const firstStudent = pair[0];
    const secondStudent = pair[1];

    const compatibleRoom = findFirstCompatibleRoom({
      rooms,
      student: firstStudent,
      configMap,
      minFreeBeds: 2,
    });

    if (!compatibleRoom) {
      fallbackStudents.push(firstStudent, secondStudent);
      continue;
    }

    const allocation1 = assignStudentToRoomSnapshot({
      room: compatibleRoom,
      student: firstStudent,
      stage: 'preferred_pair',
    });

    const allocation2 = assignStudentToRoomSnapshot({
      room: compatibleRoom,
      student: secondStudent,
      stage: 'preferred_pair',
    });

    if (!allocation1 || !allocation2) {
      fallbackStudents.push(firstStudent, secondStudent);
      continue;
    }

    allocations.push(allocation1, allocation2);
    honoredPairsCount += 1;
  }

  return {
    allocations,
    fallbackStudents,
    honoredPairsCount,
  };
};

/**
 * Group students by a derived key.
 */
const groupStudents = (students, getKey) => {
  const groups = new Map();

  for (const student of students) {
    const key = getKey(student);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(student);
  }

  return groups;
};

/**
 * Allocate grouped students in sorted group order.
 */
const allocateGroupedStudents = ({
  groups,
  groupSorter,
  rooms,
  configMap,
  stage,
  occupantMatcher,
}) => {
  const allocations = [];
  const leftovers = [];

  const orderedEntries = [...groups.entries()].sort(groupSorter);

  for (const [, students] of orderedEntries) {
    const orderedStudents = [...students].sort(sortStudents);

    const result = allocateStudentsSequentially({
      students: orderedStudents,
      rooms,
      configMap,
      stage,
      occupantMatcher,
    });

    allocations.push(...result.allocations);
    leftovers.push(...result.unallocatedStudents);
  }

  return {
    allocations,
    leftovers,
  };
};

/**
 * Preference-based allocation:
 * 1. mutual pairs first
 * 2. same year + same branch
 * 3. same year
 * 4. final random
 */
const allocatePreferenceMode = ({ students, rooms, configMap, seed }) => {
  const allStudents = [...students].sort(sortStudents);
  const { pairs, remainingStudents } = extractMutualPairs(allStudents);

  const pairResult = allocateMutualPairs({
    pairs,
    rooms,
    configMap,
  });

  let fallbackPool = [...remainingStudents, ...pairResult.fallbackStudents].sort(sortStudents);

  const sameYearBranchGroups = groupStudents(
    fallbackPool,
    (student) => `${student.gender}|${student.year}|${student.branch}`
  );

  const sameYearBranchResult = allocateGroupedStudents({
    groups: sameYearBranchGroups,
    groupSorter: ([keyA], [keyB]) => keyA.localeCompare(keyB),
    rooms,
    configMap,
    stage: 'same_year_same_branch',
    occupantMatcher: (occupant, student) =>
      occupant.gender === student.gender &&
      occupant.year === student.year &&
      occupant.branch === student.branch,
  });

  const sameYearGroups = groupStudents(
    sameYearBranchResult.leftovers,
    (student) => `${student.gender}|${student.year}`
  );

  const sameYearResult = allocateGroupedStudents({
    groups: sameYearGroups,
    groupSorter: ([keyA], [keyB]) => keyA.localeCompare(keyB),
    rooms,
    configMap,
    stage: 'same_year',
    occupantMatcher: (occupant, student) =>
      occupant.gender === student.gender && occupant.year === student.year,
  });

  const randomMaleStudents = shuffleWithSeed(
    sameYearResult.leftovers.filter((student) => student.gender === 'male'),
    `${seed}-preference-final-male`
  );

  const randomFemaleStudents = shuffleWithSeed(
    sameYearResult.leftovers.filter((student) => student.gender === 'female'),
    `${seed}-preference-final-female`
  );

  const finalRandomMale = allocateStudentsSequentially({
    students: randomMaleStudents,
    rooms,
    configMap,
    stage: 'final_random',
  });

  const finalRandomFemale = allocateStudentsSequentially({
    students: randomFemaleStudents,
    rooms,
    configMap,
    stage: 'final_random',
  });

  const allocations = [
    ...pairResult.allocations,
    ...sameYearBranchResult.allocations,
    ...sameYearResult.allocations,
    ...finalRandomMale.allocations,
    ...finalRandomFemale.allocations,
  ];

  const unallocatedStudents = [
    ...finalRandomMale.unallocatedStudents,
    ...finalRandomFemale.unallocatedStudents,
  ].map((student) => ({
    student_id: student.student_id,
    name: student.name,
    gender: student.gender,
    branch: student.branch,
    reason: `No available ${student.gender} bed found in current allocation scope`,
  }));

  return {
    allocations,
    unallocatedStudents,
    preferencePairsHonored: pairResult.honoredPairsCount,
    fallbackAllocationsCount: allocations.filter(
      (item) => item.allocation_stage !== 'preferred_pair'
    ).length,
  };
};

/**
 * Random allocation mode.
 */
const allocateRandomMode = ({ students, rooms, configMap, seed }) => {
  const randomMaleStudents = shuffleWithSeed(
    students.filter((student) => student.gender === 'male'),
    `${seed}-male`
  );

  const randomFemaleStudents = shuffleWithSeed(
    students.filter((student) => student.gender === 'female'),
    `${seed}-female`
  );

  const maleResult = allocateStudentsSequentially({
    students: randomMaleStudents,
    rooms,
    configMap,
    stage: 'random',
  });

  const femaleResult = allocateStudentsSequentially({
    students: randomFemaleStudents,
    rooms,
    configMap,
    stage: 'random',
  });

  const allocations = [
    ...maleResult.allocations,
    ...femaleResult.allocations,
  ];

  const unallocatedStudents = [
    ...maleResult.unallocatedStudents,
    ...femaleResult.unallocatedStudents,
  ].map((student) => ({
    student_id: student.student_id,
    name: student.name,
    gender: student.gender,
    branch: student.branch,
    reason: `No available ${student.gender} bed found in current allocation scope`,
  }));

  return {
    allocations,
    unallocatedStudents,
    preferencePairsHonored: 0,
    fallbackAllocationsCount: 0,
  };
};

/**
 * Branch allocation mode:
 * 1. same year + same branch
 * 2. same year
 * 3. final same-gender mixing
 *
 * This follows your confirmed rule:
 * - try same branch + year first
 * - then same year
 * - then don't leave beds unused; mix within same gender
 */
const allocateBranchMode = ({ students, rooms, configMap }) => {
  const orderedStudents = [...students].sort(sortStudents);

  // Stage 1: same year + same branch
  const sameYearBranchGroups = groupStudents(
    orderedStudents,
    (student) => `${student.gender}|${student.year}|${student.branch}`
  );

  const sameYearBranchResult = allocateGroupedStudents({
    groups: sameYearBranchGroups,
    groupSorter: ([keyA], [keyB]) => keyA.localeCompare(keyB),
    rooms,
    configMap,
    stage: 'same_year_same_branch',
    occupantMatcher: (occupant, student) =>
      occupant.gender === student.gender &&
      occupant.year === student.year &&
      occupant.branch === student.branch,
  });

  // Stage 2: leftover same year mixing
  const sameYearGroups = groupStudents(
    sameYearBranchResult.leftovers,
    (student) => `${student.gender}|${student.year}`
  );

  const sameYearResult = allocateGroupedStudents({
    groups: sameYearGroups,
    groupSorter: ([keyA], [keyB]) => keyA.localeCompare(keyB),
    rooms,
    configMap,
    stage: 'same_year',
    occupantMatcher: (occupant, student) =>
      occupant.gender === student.gender && occupant.year === student.year,
  });

  // Stage 3: final same-gender mixing so students do not remain unallocated
  const sameGenderGroups = groupStudents(
    sameYearResult.leftovers,
    (student) => `${student.gender}`
  );

  const sameGenderMixedResult = allocateGroupedStudents({
    groups: sameGenderGroups,
    groupSorter: ([keyA], [keyB]) => keyA.localeCompare(keyB),
    rooms,
    configMap,
    stage: 'same_gender_mixed',
    occupantMatcher: (occupant, student) => occupant.gender === student.gender,
  });

  const allocations = [
    ...sameYearBranchResult.allocations,
    ...sameYearResult.allocations,
    ...sameGenderMixedResult.allocations,
  ];

  const unallocatedStudents = sameGenderMixedResult.leftovers.map((student) => ({
    student_id: student.student_id,
    name: student.name,
    gender: student.gender,
    branch: student.branch,
    reason: `No available ${student.gender} bed found in current allocation scope`,
  }));

  return {
    allocations,
    unallocatedStudents,
    preferencePairsHonored: 0,
    fallbackAllocationsCount: allocations.filter(
      (item) => item.allocation_stage !== 'same_year_same_branch'
    ).length,
  };
};

/**
 * Simulate bulk allocation without touching the DB.
 */
export const simulateBulkAllocation = async ({
  mode,
  scope,
  selected_blocks = [],
  seed,
}) => {
  if (!['random', 'preference', 'branch'].includes(mode)) {
    throw new AppError('Unsupported allocation mode', 400);
  }

  const normalizedBlocks = normalizeSelectedBlocks(selected_blocks);

  if (
    scope === 'reshuffle_selected_blocks' &&
    normalizedBlocks.length === 0
  ) {
    throw new AppError(
      'Please provide selected blocks for reshuffle_selected_blocks scope',
      400
    );
  }

  const configMap = await loadConfigMap(
    scope === 'reshuffle_selected_blocks' ? normalizedBlocks : []
  );

  const targetBlocks = [...configMap.keys()].sort();

  const { candidates, skipped } = await getCandidateStudents({
    scope,
    selectedBlocks: normalizedBlocks,
    configMap,
  });

  const roomSnapshots = await loadRoomSnapshots(targetBlocks);

  const preparedRooms = prepareRoomsForScope({
    rooms: roomSnapshots,
    candidates,
    scope,
  }).sort(sortRooms);

  const totalBedsInScope = preparedRooms
    .filter((room) => room.status !== 'maintenance')
    .reduce((sum, room) => sum + room.capacity, 0);

  const occupiedBedsBefore = preparedRooms
    .filter((room) => room.status !== 'maintenance')
    .reduce((sum, room) => sum + room.occupants.length, 0);

  const candidateSnapshots = candidates.map(buildStudentSnapshot);

  let result;

  if (mode === 'preference') {
    result = allocatePreferenceMode({
      students: candidateSnapshots,
      rooms: preparedRooms,
      configMap,
      seed,
    });
  } else if (mode === 'branch') {
    result = allocateBranchMode({
      students: candidateSnapshots,
      rooms: preparedRooms,
      configMap,
    });
  } else {
    result = allocateRandomMode({
      students: candidateSnapshots,
      rooms: preparedRooms,
      configMap,
      seed,
    });
  }

  return {
    mode,
    scope,
    seed,
    selected_blocks:
      scope === 'reshuffle_selected_blocks' ? normalizedBlocks : targetBlocks,

    summary: {
      totalEligibleStudents: candidates.length,
      studentsToAllocate: candidates.length,
      studentsSkipped: skipped.length,
      studentsCouldNotBeAllocated: result.unallocatedStudents.length,
      preferencePairsHonored: result.preferencePairsHonored,
      fallbackAllocationsCount: result.fallbackAllocationsCount,
    },

    room_stats: {
      totalRoomsConsidered: preparedRooms.length,
      totalBedsInScope,
      occupiedBedsBefore,
      availableBedsBeforeAllocation: totalBedsInScope - occupiedBedsBefore,
    },

    allocations: result.allocations,
    skipped_students: skipped,
    unallocated_students: result.unallocatedStudents,

    final_rooms: preparedRooms.map((room) => ({
      room_id: room.room_id,
      room_no: room.room_no,
      hostel_block: room.hostel_block,
      floor: room.floor,
      capacity: room.capacity,
      occupied: room.occupants.length,
      available_beds: room.capacity - room.occupants.length,
      status: getSimulatedRoomStatus(room),
      occupants: room.occupants,
    })),

    meta: {
      candidate_student_ids: candidates.map((student) => student._id.toString()),
    },
  };
};

/**
 * Execute bulk allocation.
 *
 * Safety rule:
 * If preview says some students still cannot be allocated,
 * we reject execution instead of partially applying the reshuffle.
 */
export const executeBulkAllocationPlan = async ({
  mode,
  scope,
  selected_blocks = [],
  seed,
}) => {
  const preview = await simulateBulkAllocation({
    mode,
    scope,
    selected_blocks,
    seed,
  });

  if (preview.unallocated_students.length > 0) {
    throw new AppError(
      'Cannot execute bulk allocation because some students could not be allocated. Please review the preview first.',
      400
    );
  }

  const finalRoomMap = new Map(
    preview.final_rooms.map((room) => [room.room_id, room])
  );

  const candidateStudentIds = preview.meta.candidate_student_ids;
  const allocationMap = new Map(
    preview.allocations.map((allocation) => [
      allocation.student_id,
      allocation,
    ])
  );

  const affectedRooms = await Room.find({
    _id: { $in: [...finalRoomMap.keys()] },
  });

  for (const room of affectedRooms) {
    const snapshot = finalRoomMap.get(room._id.toString());

    if (!snapshot) continue;

    room.students = snapshot.occupants.map((occupant) => occupant.student_id);
    await room.save();
  }

  const candidateStudents = await Student.find({
    _id: { $in: candidateStudentIds },
  });

  for (const student of candidateStudents) {
    const assignedRoom = allocationMap.get(student._id.toString());

    if (assignedRoom) {
      student.room_no = assignedRoom.room_no;
      student.hostel_block = assignedRoom.hostel_block;
      student.floor = assignedRoom.floor;
      student.bed_no = assignedRoom.bed_no;
    } else {
      student.room_no = '';
      student.hostel_block = '';
      student.floor = null;
      student.bed_no = null;
    }

    await student.save();
  }

  return {
    preview,
    executed: {
      studentsAllocated: preview.allocations.length,
      roomsTouched: finalRoomMap.size,
    },
  };
};