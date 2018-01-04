# Gigya SDK

## Install

    npm install --save gigya-sdk

## Setup

```js
const Gigya = require('gigya-sdk');

const gigyaAccounts = new Gigya.Accounts({
  apiKey: '',
  secret: '',
  ssl: true,
});
```

## Usage

**Callbacks**

```js
gigyaAccounts.getAccountInfo({ UID: '' }, (err, result) => {
  //
});
```

**Promises**

```js
gigyaAccounts.getAccountInfo({ UID: '' }).then((response) => {
  //
});
```
