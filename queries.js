export const queries = {
  compositeFuzzyWildcard: {
    index: 'employees',
    body: {
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  { term: { is_active: true } },
                  { match: { skills: { query: "Pythn", fuzziness: "AUTO" } } }
                ]
              }
            },
            { wildcard: { name: "A*" } },
            {
              nested: {
                path: "certifications",
                query: { term: { "certifications.issuer": "Amazon" } }
              }
            },
            {
              nested: {
                path: "previous_jobs",
                query: { match: { "previous_jobs.role": "Developer" } }
              }
            }
          ],
        
        }
      },
      highlight: {
        fields: {
          name: {},
          skills: {},
          "certifications.cert_name": {},
          "previous_jobs.role": {}
        }
      }
    }
  },

  nestedCertFuzzySkills: {
    index: 'employees',
    body: {
      query: {
        bool: {
          must: [
            {
              nested: {
                path: "certifications",
                query: {
                  bool: {
                    should: [
                      { term: { "certifications.issuer": "Amazon" } },
                      { term: { "certifications.issuer": "CNCF" } }
                    ],
                  }
                },
                inner_hits: {}
              }
            },
            { range: { join_date: { gte: "2020-01-01" } } },
            {
              bool: {
                should: [
                  { fuzzy: { skills: { value: "Javascipt", fuzziness: "AUTO" } } },
                  { match: { skills: "React" } }
                ],
            
              }
            }
          ]
        }
      },
      highlight: {
        fields: {
          skills: {},
          "certifications.cert_name": {}
        }
      }
    }
  },

  employeesFuzzyWildcardSalary: {
    index: 'employees',
    body: {
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { is_active: true } },
                        { match: { skills: "Python" } }
                      ]
                    }
                  },
                  { fuzzy: { name: { value: "Jonh", fuzziness: "AUTO" } } },
                  { wildcard: { name: "Al*" } }
                ],
              }
            },
            { range: { salary: { gte: 70000 } } }
          ]
        }
      }
    }
  },

  employeesAndProjectsComplex: async (client) => {

    const empResult = await client.search({
      index: 'employees',
      body: {
        query: {
          bool: {
            should: [
              {
                bool: {
                  must: [
                    { term: { is_active: true } },
                    { match: { skills: { query: "Pythn", fuzziness: "AUTO" } } }
                  ]
                }
              },
              { wildcard: { name: "A*" } },
              {
                nested: {
                  path: "certifications",
                  query: { term: { "certifications.issuer": "Amazon" } }
                }
              },
              {
                nested: {
                  path: "previous_jobs",
                  query: { match: { "previous_jobs.role": "Developer" } }
                }
              }
            ],
          }
        },
        highlight: {
          fields: {
            name: {},
            skills: {},
            "certifications.cert_name": {},
            "previous_jobs.role": {}
          }
        }
      }
    });

    const employeeIds = empResult.hits.hits.map(doc => doc._source.employee_id);
    if (employeeIds.length === 0) {
      console.log("No matching employees found.");
      return;
    }

    const projectResult = await client.search({
      index: 'projects',
      body: {
        query: {
          bool: {
            must: [
              { terms: { employee_id: employeeIds } },
              { range: { budget: { gte: 100000 } } }
            ]
          }
        }
      }
    });

    console.log("Employees:\n", empResult.hits.hits);
    console.log("Projects:\n", projectResult.hits.hits);
  }
};
