import Complaint from '../models/Complaint.js';

/**
 * Determine the priority for a new complaint based on
 * how many similar complaints were filed recently.
 *
 * Business Rule:
 *   If 3 or more complaints of the SAME CATEGORY exist
 *   in the last 24 hours, the new complaint gets HIGH priority.
 *
 * @param {string} category - The complaint category (e.g., 'plumbing')
 * @returns {string} 'high' if threshold met, 'low' otherwise
 *
 * Why 3?
 *   1 complaint = isolated issue
 *   2 complaints = maybe coincidence
 *   3+ complaints = pattern! Needs attention → HIGH priority
 */
const checkEscalation = async (category) => {
  // Calculate the timestamp for 24 hours ago
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  // new Date() = right now (e.g., Jan 15, 2:00 PM)
  // setHours(getHours() - 24) = subtract 24 hours
  // Result: Jan 14, 2:00 PM

  // Count complaints of the same category in the last 24 hours
  const recentCount = await Complaint.countDocuments({
    category: category,
    createdAt: { $gte: twentyFourHoursAgo },
    // $gte = "greater than or equal to"
    // So this finds complaints created AFTER 24 hours ago
    //
    // MongoDB comparison operators:
    // $gt  = greater than
    // $gte = greater than or equal to
    // $lt  = less than
    // $lte = less than or equal to
    // $eq  = equal to
    // $ne  = not equal to
  });

  // If 3 or more recent complaints of same category exist,
  // the new one should be HIGH priority
  const ESCALATION_THRESHOLD = 3;

  if (recentCount >= ESCALATION_THRESHOLD) {
    return 'high';
  }

  // Otherwise, keep the default priority
  return 'low';
};

export default checkEscalation;