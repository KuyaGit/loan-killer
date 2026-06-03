// Dynamic config wrapper — lets CI inject an ever-increasing Android versionCode
// (derived from the GitHub Actions run number) without touching app.json.
// app.json remains the single source of truth for all static fields.
module.exports = ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    android: {
      ...config.expo.android,
      versionCode: parseInt(process.env.VERSION_CODE ?? '1', 10),
    },
  },
});
