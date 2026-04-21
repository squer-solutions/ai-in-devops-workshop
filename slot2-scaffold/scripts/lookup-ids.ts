// Prints the Project v2 node ID and the Status field option IDs for the
// workshop project. Cache these values in your MCP or pass them as env vars.
//
// Usage:
//   export GITHUB_TOKEN=<a PAT with `repo` + `project` scopes>
//   npm run lookup-ids

import { GraphQLClient, gql } from "graphql-request";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN not set");
  process.exit(1);
}

const owner = process.env.GITHUB_PROJECT_OWNER ?? "squer-solutions";
const number = Number(process.env.GITHUB_PROJECT_NUMBER ?? 9);

const client = new GraphQLClient("https://api.github.com/graphql", {
  headers: { authorization: `bearer ${token}` },
});

const query = gql`
  query ($owner: String!, $number: Int!) {
    organization(login: $owner) {
      projectV2(number: $number) {
        id
        title
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

type Resp = {
  organization: {
    projectV2: {
      id: string;
      title: string;
      fields: {
        nodes: Array<{
          id?: string;
          name?: string;
          options?: Array<{ id: string; name: string }>;
        }>;
      };
    };
  };
};

const data = await client.request<Resp>(query, { owner, number });
const project = data.organization.projectV2;
console.log(`Project: ${project.title}`);
console.log(`  id: ${project.id}`);
const status = project.fields.nodes.find((f) => f.name === "Status");
if (!status) {
  console.error("Status field not found");
  process.exit(2);
}
console.log(`Status field id: ${status.id}`);
console.log("Options:");
status.options?.forEach((o) => console.log(`  - ${o.name}: ${o.id}`));
