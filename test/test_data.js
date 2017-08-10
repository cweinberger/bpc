/* jshint node: true */
'use strict';

module.exports = {

  applications: {
    console: {
      id: 'console',
      scope: ['admin', 'admin:*', 'admin:console'],
      key: 'j4h2kj4h32lkh432lkh4dk32ljh4lk32djh4lkj32h4',
      algorithm: 'sha256'
    },
    bt: {
      id: 'bt',
      scope: ['bt'],
      key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
      algorithm: 'sha256'
    },
    berlingske: {
      id: 'berlingske',
      scope: ['berlingske'],
      key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyi',
      algorithm: 'sha256'
    }
  },

  users: {
    simple_first_user: {
      email: 'first_user@berlingskemedia.dk',
      id: '3218736128736123215732',
      provider: 'gigya',
      lastLogin: new Date(),
      dataScopes: {
        'bt': {
          bt_paywall: true,
          bt_subscription_tier: 'free'
        },
        'berlingske': {
          berlingske_paywall: true,
          berlingske_subscription_tier: 'premium'
        }
      },
      providerData: {}
    },
    simple_second_user: {
      email: 'second_user@berlingskemedia.dk',
      id: '5347895384975934842757',
      provider: 'gigya',
      lastLogin: new Date(),
      dataScopes: {
        'bt': {
          bt_paywall: true,
          bt_subscription_tier: 'free'
        },
        'berlingske': {
          berlingske_paywall: true,
          berlingske_subscription_tier: 'premium'
        }
      },
      providerData: {}
    },
    console_superadmin_google_user: {
      email: 'console_admin@berlingskemedia.dk',
      id: '1111111111111111111111',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {},
      providerData: {}
    },
    console_google_user: {
      email: 'console_user@berlingskemedia.dk',
      id: '2222222222222222222222',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {},
      providerData: {}
    }
  },

  grants: {
    console_superadmin_google_user__console_grant : {
      id : '7462ydu3jjj3u32uej3mmsi3',
      app : 'console',
      user : '1111111111111111111111',
      scope : ['admin:*'],
      exp : null,
      createdAt: new Date()
    },
    console_google_user__console_grant : {
      id : '7362ydu3kkk3u65uej3mmsi4',
      app : 'console',
      user : '2222222222222222222222',
      scope : [],
      exp : null,
      createdAt: new Date()
    }
  }
};
