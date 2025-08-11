const getHelloWorld = (req, res) => {
  res.json({ massage: "Hello World from API!" });
};

module.exports = { getHelloWorld };
