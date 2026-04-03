/**
 * Paginate a Mongoose query
 *
 * This is a GENERIC utility — works with ANY model.
 * Pass it a query, page number, and limit, and it returns
 * paginated results with metadata.
 *
 * @param {Model} model - Mongoose model (e.g., Complaint, Outpass)
 * @param {object} filter - MongoDB filter query (e.g., { status: 'pending' })
 * @param {object} options - Pagination options
 * @param {number} options.page - Current page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.sort - Sort field and order (default: '-createdAt')
 * @param {string} options.populate - Fields to populate (optional)
 * @param {string} options.select - Fields to include/exclude (optional)
 *
 * @returns {object} { data, pagination }
 *
 * Usage:
 *   const result = await paginate(Complaint, { status: 'pending' }, {
 *     page: 2,
 *     limit: 10,
 *     sort: '-createdAt',
 *     populate: 'student_id',
 *   });
 */
const paginate = async (model, filter = {}, options = {}) => {
  // Extract options with defaults
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  // Math.max(1, ...) ensures page is at least 1
  // If someone sends page=0 or page=-5, it becomes 1

  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
  // Math.min(100, ...) caps the limit at 100 (prevent someone requesting 10,000 items)
  // Math.max(1, ...) ensures limit is at least 1

  const sort = options.sort || '-createdAt';
  // Default sort: newest first
  // '-createdAt' means descending (newest first)
  // 'createdAt' (without minus) means ascending (oldest first)

  const skip = (page - 1) * limit;
  // Calculate how many documents to skip
  // Page 1: skip 0, Page 2: skip 20, Page 3: skip 40...

  // Count total documents matching the filter
  // This runs in PARALLEL with the main query (Promise.all)
  // so we don't wait for one to finish before starting the other
  const [totalItems, data] = await Promise.all([
    model.countDocuments(filter),
    // countDocuments() is faster than find().length
    // It uses indexes and doesn't load documents into memory

    // Build and execute the main query
    (() => {
      let query = model.find(filter).sort(sort).skip(skip).limit(limit);

      // Add populate if specified
      if (options.populate) {
        query = query.populate(options.populate);
      }

      // Add field selection if specified
      if (options.select) {
        query = query.select(options.select);
      }

      return query.exec();
      // .exec() explicitly executes the query and returns a proper Promise
    })(),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalItems / limit);
  // Math.ceil rounds UP: ceil(5000/20) = 250 pages
  // Math.ceil(1/20) = 1 (even 1 item needs 1 page)

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export default paginate;