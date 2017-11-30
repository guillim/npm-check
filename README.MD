# Email Check SIMPLE
Node Js API for email validation forked from Elias Hussary <eliashussary@gmail.com>
* email pattern validation,
* MX mail server existence,
* mailbox existence.


## Install
```sh
npm install https://github.com/guillim/npm-check
```

## Usage
#### Notes
* Ensure you execute this in an environment where SMTP port 25 is accessible. Failing to do so will throw error *Mailbox check failed*.

```Javascript
import MailConfirm from 'mail-confirm'

const emailResponse = new MailConfirm({
      emailAddress: 'emailToBeTested@gmail.com',
      timeout: 8000,
      mailFrom: 'my@email.com',
      invalidMailboxKeywords: [],
      debug : false
});

return emailResponse.check();

/*
output =>
    {
    emailAddress: 'emailToBeTested@gmail.com',
    result: true }
  */
  ```
  #### result = true
*  means the email is verified *

  #### result = false
*  means the email could not be verified, or it is wrong *
