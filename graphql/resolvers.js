const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

module.exports = {
  Query: {
    getUser: async (_, { id }) => {
      return await User.findById(id);
    },
    getCurrentUser: async (_, __, context) => {
      const user = auth(context);
      return await User.findById(user.id).populate('friends friendRequests');
    },
    getPosts: async () => {
      return await Post.find().sort({ createdAt: -1 }).populate('author');
    },
    getFriendRequests: async (_, __, context) => {
      const user = auth(context);
      const currentUser = await User.findById(user.id).populate('friendRequests');
      return currentUser.friendRequests;
    },
  },
  Mutation: {
    register: async (_, { username, email, password }) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });

      const res = await newUser.save();
      const token = jwt.sign(
        { id: res.id, email: res.email, username: res.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return {
        ...res._doc,
        id: res._id,
        token,
      };
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },
    updateProfile: async (_, { bio }, context) => {
      const user = auth(context);
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { bio },
        { new: true }
      ).populate('friends friendRequests');
      return updatedUser;
    },
    createPost: async (_, { content }, context) => {
      const user = auth(context);
      const newPost = new Post({
        content,
        author: user.id,
      });
      const post = await newPost.save();
      return await post.populate('author');
    },
    sendFriendRequest: async (_, { userId }, context) => {
      const user = auth(context);
      const recipient = await User.findById(userId);
      if (!recipient) {
        throw new Error('User not found');
      }
      if (recipient.friendRequests.includes(user.id)) {
        throw new Error('Friend request already sent');
      }
      recipient.friendRequests.push(user.id);
      await recipient.save();
      return recipient;
    },
    acceptFriendRequest: async (_, { userId }, context) => {
      const user = auth(context);
      const currentUser = await User.findById(user.id);
      if (!currentUser.friendRequests.includes(userId)) {
        throw new Error('No friend request from this user');
      }
      currentUser.friendRequests = currentUser.friendRequests.filter(
        (id) => id.toString() !== userId
      );
      currentUser.friends.push(userId);
      await currentUser.save();
      
      const friend = await User.findById(userId);
      friend.friends.push(user.id);
      await friend.save();
      
      return await currentUser.populate('friends friendRequests');
    },
    rejectFriendRequest: async (_, { userId }, context) => {
      const user = auth(context);
      const currentUser = await User.findById(user.id);
      currentUser.friendRequests = currentUser.friendRequests.filter(
        (id) => id.toString() !== userId
      );
      await currentUser.save();
      return await currentUser.populate('friends friendRequests');
    },
  },
};