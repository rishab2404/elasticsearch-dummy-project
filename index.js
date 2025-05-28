import { Client } from '@elastic/elasticsearch';
import fs from 'fs';

const client = new Client({ node: 'http://localhost:9200' });

async function run() {
  // employees index with mapping
  await client.indices.create({
    index: 'employees',
    body: {
      mappings: {
        properties: {
          employee_id: { type: 'keyword' },
          name: { type: 'text' },
          age: { type: 'integer' },
          salary: { type: 'float' },
          is_active: { type: 'boolean' },
          join_date: { type: 'date' },
          skills: { type: 'text' },
          location: { type: 'geo_point' }
        }
      }
    }
  }, { ignore: [400] });

  //projects index with mapping
  await client.indices.create({
    index: 'projects',
    body: {
      mappings: {
        properties: {
          project_id: { type: 'keyword' },
          name: { type: 'text' },
          employee_id: { type: 'keyword' },
          budget: { type: 'float' },
          start_date: { type: 'date' }
        }
      }
    }
  }, { ignore: [400] });

  // Bulk insert employees
  const employees = JSON.parse(fs.readFileSync('./data/employees.json', 'utf-8'));
  const empBulk = employees.flatMap(doc => [{ index: { _index: 'employees', _id: doc.employee_id } }, doc]);
  await client.bulk({ body: empBulk, refresh: true });

  // Bulk insert projects
  const projects = JSON.parse(fs.readFileSync('./data/projects.json', 'utf-8'));
  const projBulk = projects.flatMap(doc => [{ index: { _index: 'projects', _id: doc.project_id } }, doc]);
  await client.bulk({ body: projBulk, refresh: true });

  // query
  const empResult = await client.search({
    index: 'employees',
    body: {
      query: {
        bool: {
          must: [
            { term: { is_active: true } },
            { range: { salary: { gte: 80000 } } },
            { match: { skills: "Python" } }
          ]
        }
      }
    }
  });

  const qualifiedEmpIds = empResult.hits.hits.map(doc => doc._source.employee_id);

  // projects for those employees with high budget
  const projectResult = await client.search({
    index: 'projects',
    body: {
      query: {
        bool: {
          must: [
            { terms: { employee_id: qualifiedEmpIds } },
            { range: { budget: { gte: 100000 } } }
          ]
        }
      }
    }
  });

  console.log("Qualified Employees:\n", empResult.hits.hits);
  console.log("Their High-Budget Projects:\n", projectResult.hits.hits);
}

run().catch(console.error);
