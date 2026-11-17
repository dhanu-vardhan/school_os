/**
 * Backwards-compatible façade for the demo account catalogue.
 * New code should import from `./identity/demo-accounts.js`.
 */
export {
  SCHOOL_A,
  SCHOOL_B,
  SCHOOL_A_NAME,
  SCHOOL_B_NAME,
  DEMO_ACCOUNTS,
  findDemoAccount as findDemoUser,
  publicDemoAccounts as publicDemoUsers,
} from './identity/demo-accounts.js'
