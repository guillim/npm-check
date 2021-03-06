'use strict';

/** testLog = true will print all the console.log in order to make debug easier */
var testLog = false;


var _dns = require('dns');
var _dns2 = _interopRequireDefault(_dns);
var _net = require('net');
var _net2 = _interopRequireDefault(_net);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }


function log(testLog,whatToLog){if(testLog){console.log(whatToLog);}}
function del(testLog,obj){
  if (!testLog) {
    delete obj.invalidMailboxKeywords;
    delete obj.mailbox;
    delete obj.hostname;
    delete obj.mxRecords;
    delete obj.smtpMessages;
    delete obj.timeout;
    delete obj.mailFrom;
    delete obj.isComplete;
    delete obj.status;
    delete obj.smtpResponse;
    delete obj.isTimedout;
    delete obj.isValidPattern;
    delete obj.isValidMx;
    delete obj.isValidMailbox;
    delete obj.debug;
  }
}

/**
 * Find the MX records associated with the domain name of the website
*/
const resolveMx = hostname => {
  return new Promise((resolve, reject) => {
    _dns2.default.resolveMx(hostname, (err, val) => {
      if (err) {        return reject(err);      }
      resolve(val);
    });
  });
};

/**
 * Email address validation and SMTP verification API.

 * @param {Object} config - The email address you want to validate.
 * @param {string} config.emailAddress - The email address you want to validate.
 * @param {string} [config.mailFrom] - The email address used for the mail from during SMTP mailbox validation.
 * @param {string[]} [config.invalidMailboxKeywords] - Keywords you want to void, i.e. noemail, noreply etc.
 * @param {number} [config.timeout] - The timeout parameter for SMTP mailbox validation.
 * @returns {instance}
 * @class MailConfirm
 */
class MailConfirm {
  constructor({ emailAddress, invalidMailboxKeywords, timeout, mailFrom, debug = false }) {
    this.state = {
      // args
      debug: debug,
      emailAddress,
      timeout: timeout || 10000,
      invalidMailboxKeywords: invalidMailboxKeywords || [],
      mailFrom: mailFrom || 'email@example.org',
      // helpers
      mailbox: emailAddress.split('@')[0],
      hostname: emailAddress.split('@')[1],
      mxRecords: [],
      smtpMessages: [],
      isComplete: false,
      status: 0,
      smtpResponse: '',
      // results
      isTimedout: false,
      isValidPattern: false,
      isValidMx: false,
      isValidMailbox: false,
      result: false,
    };
  }

  /**
   * Determines if the email address pattern is valid based on regex and invalid keyword check.
   *
   * @static
   * @param {string} emailAddress - The full email address ypu want to check.
   * @param {string[]} [invalidMailboxKeywords=[]] - An array of keywords to invalidate your check, ie. noreply, noemail, etc.
   * @returns {boolean}
   * @memberof MailConfirm
   */
  static resolvePattern(emailAddress, invalidMailboxKeywords = []) {
    const mailbox = emailAddress.split('@')[0];
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const isValidPattern = regex.test(emailAddress) || invalidMailboxKeywords.indexOf(mailbox) === -1;
    return isValidPattern;
  }

  // private instance method
  _resolvePattern(emailAddress, invalidMailboxKeywords = []) {
    return MailConfirm.resolvePattern(emailAddress, invalidMailboxKeywords);
  }

  /**
   * Wrap of dns.resolveMx native method.
   *
   * @static
   * @param {string} hostname - The hostname you want to resolve, i.e. gmail.com
   * @returns {Object[]} - Returns MX records array { priority, exchange }
   * @memberof MailConfirm
   */
  static resolveMx(hostname) {
    return _asyncToGenerator(function* () {
      // mx check
      try {
        let mxRecords = yield resolveMx(hostname);
        return mxRecords.sort(function (a, b) {
          return a.priority - b.priority;
        });
      } catch (err) {
        return [];
      }
    })();
  }

  // private instance method
  _resolveMx(hostname) {
    return MailConfirm.resolveMx(hostname);
  }

  /**
   * Runs the SMTP mailbox check. Commands for HELO/EHLO, MAIL FROM, RCPT TO.
   *
   * @static
   * @param {Object} config - Object of parameters for Smtp Mailbox resolution.
   * @param {string} config.emailAddress - The email address you want to check.
   * @param {object[]} config.mxRecords - The MX Records array supplied from resolveMx.
   * @param {number} config.timeout - Timeout parameter for the SMTP routine.
   * @param {string} config.mailFrom - The email address supplied to the MAIL FROM SMTP command.
   * @returns {object[]} - Object of SMTP responses [ {command, status, message} ]
   * @memberof MailConfirm
   */
  static resolveSmtpMailbox({ emailAddress, mxRecords, timeout, mailFrom }) {
    return new Promise((resolve, reject) => {
      const host = mxRecords[0].exchange;
      const commands = [`HELO ${host}`, `MAIL FROM: <${mailFrom}>`, `RCPT TO: <${emailAddress}>`, `QUIT` ];

      log(testLog,'commands');
      log(testLog,commands);

      const stepMax = commands.length - 1;
      let step = 0;
      let receivedReadyMsg = false;

      var timerForRefusedConnection;

      const smtp = _net2.default.createConnection({ port: 25, host });
      let smtpMessages = [];

      smtp.setEncoding('ascii');

      /** timer when the server refuses to allow us with a connection (happens after too many tries) */
      timerForRefusedConnection = setTimeout(function() {
          log(testLog,"TELENT refused: Connection exceeded timeout");
          smtp.end();
          resolve(smtpMessages);
      }, timeout);


      smtp.on('next', () => {

        log(testLog,'\r\n');
        if (step <= stepMax) {
          smtp.write(commands[step] + '\r\n');
          step++;
        } else {
          clearTimeout(timerForRefusedConnection);
          smtp.end(() => {
            resolve(smtpMessages);
          });
        }
      });

      smtp.on('error', err => {
        clearTimeout(timerForRefusedConnection);
        smtp.end(() => {
          log(testLog,'err');
          log(testLog,err);
          reject(err);
        });
      });

      smtp.on('data', data => {
        let dataNoSpaces = data.replace('\r\n','');
        log(testLog,'step='+step+'---- receivedReadyMsg='+ receivedReadyMsg+'---- data='+dataNoSpaces);
        const status = parseInt(dataNoSpaces.substring(0, 3));
        const regex = /(211|214|220|221|250|251|354|421|450|451|452|500|501|502|503|504|550|551|552|553|554) /g;
        const containsAnotherStatus = regex.test(data.substring(3) );

        /**
          * we set up the telnet data (= data from telnet command) in order to skip it if telnet sends multiple times the answer 'ready 220'
        */
        if (receivedReadyMsg === false) {
           log(testLog,'first telnet: next()');
           receivedReadyMsg = true;
           if (status > 200) {
             smtp.emit('next');
           }
         }else if(status === 220 && !containsAnotherStatus){ /**    2eme message 220 qui arrive   */
             log(testLog,'second telnet, doing nothing');
         }else if(status === 220 && containsAnotherStatus){  /**    2eme message 220 qui arrive avec un autre message, car melange   */
             log(testLog,'second telnet, mixed. going next()');
             smtpMessages.push({
               command: commands[step-1],
               message: dataNoSpaces,
               status
             });
             smtp.emit('next');
         }else{
           smtpMessages.push({
             command: commands[step-1],
             message: dataNoSpaces,
             status
           });
           if (status > 200) {
               log(testLog,'going next()');
               smtp.emit('next');
           }
         }

      });
    });
  }
  // private instance method
  _resolveSmtpMailbox({ emailAddress, mxRecords, timeout, mailFrom }) {
    return MailConfirm.resolveSmtpMailbox({
      emailAddress,
      mxRecords,
      timeout,
      mailFrom
    });
  }

  /**
   * Runs the email validation routine and supplies a final result.
   *
   * @returns {Object} - The instance state object containing all of the isValid* boolean checks, MX Records, and SMTP Messages.
   * @memberof MailConfirm
   */
  check() {
    var _this = this;
    return _asyncToGenerator(function* () {
      testLog = _this.state.debug;
      // pattern check
      const isValidPattern = _this._resolvePattern(_this.state.emailAddress, _this.state.invalidMailboxKeywords);
      _this.state.isValidPattern = isValidPattern;

      if (!isValidPattern) {

        del(testLog,_this.state);
        return _this.state;
      }
      // mx check
      try {
        const mxRecords = yield _this._resolveMx(_this.state.hostname);
        const isValidMx = mxRecords.length > 0;

        _this.state.mxRecords = mxRecords;
        _this.state.isValidMx = isValidMx;

        if (!isValidMx) {
          del(testLog,_this.state);
          return _this.state;
        }
      } catch (err) {
        log(testLog,'catch Error MX record check failed'); //throw new Error('MX record check failed.');
      }

      // mailbox check
      try {
        log(testLog,'mailbox check()');

        const { emailAddress, mxRecords, timeout, mailFrom } = _this.state;
        const smtpMessages = yield _this._resolveSmtpMailbox({
          emailAddress,
          mxRecords,
          timeout,
          mailFrom
        });
        log(testLog,smtpMessages);

        _this.state.smtpMessages = smtpMessages;
        const isComplete = smtpMessages.length === 4;

        _this.state.isComplete = isComplete;


        if (isComplete) {
          log(testLog,'isComplete');

          const { status, message } = smtpMessages[2];
          _this.state.status = status;
          _this.state.smtpResponse = message;

          if (status === 250) {
            _this.state.result = true;
            _this.state.isValidMailbox = true;
          } else {
            _this.state.result = false;
            _this.state.isValidMailbox = false;
          }
        } else {
          log(testLog,'not Complete');
          _this.state.result = false;
          _this.state.isValidMailbox = false;
          _this.state.isTimedout = true;
        }
        del(testLog,_this.state);

        return _this.state;
      } catch (err) {
        log(testLog,'catch Error Mailbox check failed'); //throw new Error('Mailbox check failed.');
      }
    })();
  }
}

module.exports = MailConfirm;
