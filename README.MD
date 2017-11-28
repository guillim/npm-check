# MailConfirm
A Node Js API for email validation forked from Elias Hussary <eliashussary@gmail.com>;
* email pattern validation,
* MX mail server existence,
* mailbox existence.

*NOTE: True mailbox existence may only be performed, with certainty, by sending a verification email and having the user verify their email.*

## Install
```sh
npm i mail-confirm
```

## Usage
#### Notes
* Ensure you execute this in an environment where SMTP port 25 is accessible. Failing to do so will throw error *Mailbox check failed*.

```Javascript
import MailConfirm from 'mail-confirm'

// promises
const email = new MailConfirm({
    emailAddress: 'test@gmail.com',
    timeout: 2000,
    mailFrom: 'my@email.com',
    invalidMailboxKeywords: ['noreply', 'noemail']
})

email.check().then(console.log).catch(console.log)

// async/await
const check = async (emailAddress) => {
    try{
        const email = new MailConfirm({ emailAddress })
        const result = await email.check()
        return result
    }catch(err){
        throw new Error(err)
    }
}

check('test@gmail.com')
/*
output =>
    {
    emailAddress: 'test@gmail.com',
    isValidPattern: true,
    isValidMx: true,
    isValidMailbox: false,
    result: 'Could not validate mailbox.' }
  */
  ```
