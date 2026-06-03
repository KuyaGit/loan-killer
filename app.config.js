// Dynamic config wrapper — lets CI inject an ever-increasing Android versionCode
// (derived from the GitHub Actions run number) without touching app.json.
// app.json remains the single source of truth for all static fields.
// Expo passes the inner `expo` object from app.json as `config` (the wrapper
// key is stripped), so we spread config directly — no `config.expo` nesting.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: parseInt(process.env.VERSION_CODE ?? '1', 10),
  },
});
