claim:
  {
    id: createUuid(),
    description: 'Fluege Antalya',
    by: 'you', for: ['you', 'me'],
    amount: 145,
    currency: 'EUR'
  }
  
tab:
  name
  participants
  id
  claimVersions
  
commit:
* - from: (string)
* - mesageType: initial, proposal, update, ack, nack
  - previous (SHA1)
  - updates (SHA1)
  - tab (SHA1)
  - cycleIn (SHA1)
  - cycleOut (SHA1)
  - entry:
  * - description
  * - by
  * - for
  * - amount
  * - currency
    - timestamp
  - balances
  - padding
  
- commits
- signatures on commits

start a tab with an 'initial' commit
add an entry by publishing a commit: proposal, stays unconfirmed until it has ack by each involved (by, for). one nack reverts it.

a contact can offer settlement, for instance i would offer:
* countertabbing (cycles)
* paypal
* iban
* creditcard (outgoing)
* ripple (limit amount of euros, xrp i am willing to receive/able to send?)
* bitcoin
* cash-in-hand (euros)

balances need to be signed to fix currency conversion rates (especially with bitcoin and xrp)
indicate slack per contact so they know when a settlement is desired.