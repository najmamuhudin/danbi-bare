class AnalysisDB {
  constructor() {
    this.analyses = [];
  }

  async save(analysisData) {
    const newAnalysis = {
      _id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date(),
      ...analysisData
    };
    this.analyses.push(newAnalysis);
    return newAnalysis;
  }

  async find() {
    return {
      sort: () => ({
        skip: (s) => ({
          limit: (l) => ({
            select: () => {
              return [...this.analyses].sort((a, b) => b.createdAt - a.createdAt).slice(s, s + l);
            }
          }),
          select: () => {
            return [...this.analyses].sort((a, b) => b.createdAt - a.createdAt).slice(s);
          }
        }),
        limit: (l) => ({
          select: () => {
            return [...this.analyses].sort((a, b) => b.createdAt - a.createdAt).slice(0, l);
          }
        })
      })
    };
  }

  async countDocuments(query = {}) {
    if (Object.keys(query).length === 0) {
      return this.analyses.length;
    }
    if (query['result.is_crime'] !== undefined) {
      return this.analyses.filter(a => a.result && a.result.is_crime === query['result.is_crime']).length;
    }
    return 0;
  }

  async aggregate(pipeline) {
    // Only implemented group by type
    const typeCount = {};
    this.analyses.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    });
    return Object.entries(typeCount).map(([type, count]) => ({ _id: type, count }));
  }

  async findById(id) {
    return this.analyses.find(a => a._id === id);
  }
}

module.exports = new AnalysisDB();
