module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Styles are largely driven by the CMS theme at runtime, so inline style objects are intentional.
    'react-native/no-inline-styles': 'off',
  },
};
