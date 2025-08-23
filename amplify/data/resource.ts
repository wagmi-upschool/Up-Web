import { defineData } from '@aws-amplify/backend';

const schema = /* GraphQL */ `
  type Todo @model @auth(rules: [{ allow: owner }]) {
    id: ID!
    content: String!
    done: Boolean!
    owner: String
  }
`;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});