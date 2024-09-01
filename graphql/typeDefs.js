const { gql } = require('apollo-server-express');

module.exports = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    friends: [User]
    friendRequests: [User]
    token: String
  }

  type Post {
    id: ID!
    content: String!
    author: User!
    createdAt: String!
  }

  type Query {
    getUser(id: ID!): User
     getCurrentUser: User
    getPosts: [Post]
    getFriendRequests: [User]
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User!
    login(email: String!, password: String!): User!
    updateProfile(bio: String!): User!
    createPost(content: String!): Post!
    sendFriendRequest(userId: ID!): User!
    acceptFriendRequest(userId: ID!): User!
    rejectFriendRequest(userId: ID!): User!
  }
`;