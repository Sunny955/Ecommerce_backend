const advancedFiltering = (model) => {
    return async (req, res, next) => {
        // Filtering
        let queryObj = { ...req.query };
        const excludeFields = ["page", "sort", "limit", "fields"];
        excludeFields.forEach((el) => delete queryObj[el]);
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

        req.advancedFilter = model.find(JSON.parse(queryStr));

        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(",").join(" ");
            req.advancedFilter = req.advancedFilter.sort(sortBy);
        } else {
            req.advancedFilter = req.advancedFilter.sort("-createdAt");
        }

        // Field limiting
        if (req.query.fields) {
            const fields = req.query.fields.split(",").join(" ");
            req.advancedFilter = req.advancedFilter.select(fields);
        } else {
            req.advancedFilter = req.advancedFilter.select("-__v");
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await model.countDocuments();

        req.advancedFilter = req.advancedFilter.skip(startIndex).limit(limit);

        // Pagination result
        const pagination = {
            current: page,
            total: Math.ceil(total / limit)
        };

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit,
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit,
            };
        }

        // Append pagination to req.advancedFilter
        req.advancedFilter.pagination = pagination;

        next();
    };
}

module.exports = {advancedFiltering};