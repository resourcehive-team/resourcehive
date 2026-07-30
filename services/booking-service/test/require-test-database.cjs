module.exports = async function requireTestDatabase() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is required for Booking Service database tests.",
    );
  }
};
