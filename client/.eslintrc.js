module.exports = {
	root: true,
	env: {
		node: true,
    'vue/setup-compiler-macros': true
	},
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
		'plugin:@typescript-eslint/recommended'
  ],
	parser: 'vue-eslint-parser',
	parserOptions: {
		parser: '@typescript-eslint/parser',
		sourceType: 'module'
	},
  rules: {
    // override/add rules settings here, such as:
    // 'vue/no-unused-vars': 'error'
  }
}