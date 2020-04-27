import { Connection } from 'typeorm';
import { User } from '../../entity/User';
import createTypeormConnection from '../../utils/create_typeorm_connection';
import { request } from 'graphql-request';

const graphql_endpoint = 'http://localhost:3001/graphql';
let conn: Connection;

beforeEach(async () => {
  conn = await createTypeormConnection();
});

afterEach(async () => {
  await conn.close();
});

test('Can register user', async () => {
  const log = console.log;
  console.log = () => {};

  const email = `first@example.com`;

  const mutation = `mutation {
    register(firstName: "first name", lastName: "last name", password: "123", email: "${email}", profile: {
      favoriteColor: "green"
    }) {
      firstName
      lastName
      email
    }
  }`;
  const expected = {
    register: {
      email,
      firstName: 'first name',
      lastName: 'last name',
    },
  };

  const response = await request(graphql_endpoint, mutation);

  expect(response).toEqual(expected);

  const users = await User.find({ email });
  expect(users).toHaveLength(1);
  expect(users[0].email).toEqual(email);
  expect(users[0].password).not.toEqual('123');

  console.log = log;
});
