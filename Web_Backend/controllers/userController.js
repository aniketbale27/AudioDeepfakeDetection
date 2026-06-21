const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const serializeUser = (userDoc) => ({
  id: userDoc._id.toString(),
  name: userDoc.name,
  email: userDoc.email,
  joined_at: userDoc.createdAt.toISOString(),
});

const validateRegisterBody = ({ name, email, password }) => {
  if (!name || !email || !password) {
    return "Name, email, and password are required.";
  }
  if (!EMAIL_REGEX.test(String(email).toLowerCase())) {
    return "Invalid email format.";
  }
  if (String(password).length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
};

const registerUser = async (req, res) => {
  try {
    const validationError = validateRegisterBody(req.body);
    if (validationError) {
      return res.status(400).json({ detail: validationError });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ detail: "User with this email already exists." });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password: String(password),
    });

    return res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ detail: "User with this email already exists." });
    }
    return res.status(500).json({ detail: "Failed to register user." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const isPasswordValid = await user.comparePassword(String(password));
    if (!isPasswordValid) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return res.status(500).json({ detail: "Failed to login user." });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return res.status(400).json({ detail: "Invalid user id." });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ detail: "Name cannot be empty." });
      }
      user.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ detail: "Invalid email format." });
      }

      const existing = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existing) {
        return res.status(409).json({ detail: "Another user already uses this email." });
      }

      user.email = normalizedEmail;
    }

    if (password !== undefined) {
      if (String(password).length < 6) {
        return res.status(400).json({ detail: "Password must be at least 6 characters." });
      }
      user.password = String(password);
    }

    await user.save();

    return res.status(200).json(serializeUser(user));
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ detail: "Another user already uses this email." });
    }
    return res.status(400).json({ detail: "Failed to update user." });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
};

