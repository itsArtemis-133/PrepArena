const crypto = require("crypto");
const Test = require("../models/Test");

exports.createTest = async (req, res) => {
  const { title, type, testMode, testLength, scheduledDate, pdf } = req.body;
  const userId = req.user.id;

  try {
    const uniqueLink = crypto.randomBytes(8).toString("hex");

    const newTest = new Test({
      title,
      type,
      testMode,
      testLength,
      scheduledDate,
      pdf,
      createdBy: userId,
      link: uniqueLink,  // Keep just the hex string, not full BASE_URL
    });

    await newTest.save();
    res.status(201).json({ message: "Test created successfully", test: newTest });
  } catch (err) {
    res.status(500).json({ message: "Failed to create test", error: err.message });
  }
};

exports.cancelTest = async (req, res) => {
  const { id } = req.params;

  try {
    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    test.status = "Cancelled";
    await test.save();

    res.status(200).json({ message: "Test cancelled successfully", test });
  } catch (err) {
    res.status(500).json({ message: "Error cancelling test", error: err.message });
  }
};

exports.rescheduleTest = async (req, res) => {
  const { id } = req.params;
  const { scheduledDate } = req.body;

  try {
    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    test.scheduledDate = scheduledDate;
    test.status = "Scheduled";
    await test.save();

    res.status(200).json({ message: "Test rescheduled successfully", test });
  } catch (err) {
    res.status(500).json({ message: "Error rescheduling test", error: err.message });
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.user.id }).sort({ scheduledDate: 1 });
    res.status(200).json({ tests });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tests", error: err.message });
  }
};

exports.getPublicTest = async (req, res) => {
  const { uniqueId } = req.params;

  try {
    console.log("Received ID:", `"${uniqueId}"`);

    const test = await Test.findOne({ link: uniqueId.trim() });

    if (!test) {
      console.log("No test found for:", uniqueId.trim());
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ test });
  } catch (err) {
    res.status(500).json({ message: "Error fetching test", error: err.message });
  }
};



