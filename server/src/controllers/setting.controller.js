const Setting = require('../models/Setting');
const { successResponse, errorResponse } = require('../utils/helpers');

const DEFAULTS = {
  maxWinsPerMonth: 2,
};

const getSettings = async (req, res, next) => {
  try {
    const docs = await Setting.find().lean();
    const settings = { ...DEFAULTS };
    docs.forEach(d => { settings[d.key] = d.value; });
    return successResponse(res, settings);
  } catch (err) { next(err); }
};

const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined || value === null) return errorResponse(res, 'value required', 400);
    const doc = await Setting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    return successResponse(res, doc);
  } catch (err) { next(err); }
};

const getSettingValue = async (key) => {
  const doc = await Setting.findOne({ key }).lean();
  return doc !== null ? doc.value : DEFAULTS[key];
};

module.exports = { getSettings, updateSetting, getSettingValue };
