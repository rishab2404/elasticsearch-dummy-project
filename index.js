import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import { queries } from './queries.js';

const client = new Client({ node: 'http://localhost:9200' });

async function setupIndicesAndData() {
  // Employees index with nested fields in mapping
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
          location: { type: 'geo_point' },
          certifications: {
            type: 'nested',
            properties: {
              cert_name: { type: 'text' },
              issue_date: { type: 'date' },
              issuer: { type: 'keyword' }
            }
          },
          previous_jobs: {
            type: 'nested',
            properties: {
              company: { type: 'text' },
              role: { type: 'keyword' },
              years: { type: 'integer' }
            }
          }
        }
      }
    }
  }, { ignore: [400] });

  // Projects index with mapping
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

  console.log("Setup complete: indices created and data loaded.");
}

async function runAllQueries() {
  console.log("Running compositeFuzzyWildcard...");
  let res = await client.search(queries.compositeFuzzyWildcard);
  console.log(res.hits.hits);

  console.log("\nRunning nestedCertFuzzySkills...");
  res = await client.search(queries.nestedCertFuzzySkills);
  console.log(res.hits.hits);

  console.log("\nRunning employeesFuzzyWildcardSalary...");
  res = await client.search(queries.employeesFuzzyWildcardSalary);
  console.log(res.hits.hits);

  console.log("\nRunning employeesAndProjectsComplex...");
  await queries.employeesAndProjectsComplex(client);
}

async function main() {
  try {
    await setupIndicesAndData();
    await runAllQueries();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();

