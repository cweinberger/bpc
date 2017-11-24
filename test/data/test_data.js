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
    },
    valid_app: {
      id: 'valid-app',
      scope: [
        'admin',
        'admin:*',
        'business:all',
        'bt:all'
      ],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256'
    },
    delete_me_app: {
      id: 'delete-me-app',
      scope: [
        'admin',
        'admin:*',
        'admin:gdfgfd',
        'admin:uyutyutu'
      ],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256'
    },
    app_with_disallowAutoCreationGrants: {
      id: 'app_with_disallowAutoCreationGrants',
      scope: [],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256',
      settings: {
        disallowAutoCreationGrants: true
      }
    },
    app_with_users_scope: {
      id: 'app_with_users_scope',
      scope: ['users'],
      key: '908345kojte9kgjef08934j5lkjgfed890435lkjgle',
      algorithm: 'sha256'
    },
    app_with_profile_scope: {
      id: 'app_with_profile_scope',
      scope: ['profile'],
      key: '908345kojte9kgjef08934j5lkjgfed890435lkjglz',
      algorithm: 'sha256'
    },
    app_with_anonymous_scope: {
      id: 'app_with_anonymous_scope',
      scope: ['anonymous', 'anothernotanonynmousscope'],
      key: '90835fgfgfjtregjefre34jvcxvxkjfed89043lkgle',
      algorithm: 'sha256',
      settings: {
        allowAnonymousUsers: true
      }
    },
    app_with_gigya_provider: {
      id: 'app_with_gigya_provider',
      scope: [],
      key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyi',
      algorithm: 'sha256',
      settings: { provider: 'gigya'}
    },
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
      }
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
      }
    },
    console_superadmin_google_user: {
      email: 'console_admin@berlingskemedia.dk',
      id: '1111111111111111111111',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {}
    },
    console_google_user: {
      email: 'console_user@berlingskemedia.dk',
      id: '2222222222222222222222',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {}
    },
    mkoc_user: {
      email: 'mkoc@berlingskemedia.dk',
      id: '117880216634946654515',
      provider: 'gigya',
      lastLogin: new Date(),
      dataScopes: {}
    }
  },

  grants: {
    console_superadmin_google_user__console_grant : {
      id : '7462ydu3jjj3u32uej3mmsi3',
      app : 'console',
      user : 'console_admin@berlingskemedia.dk',
      scope : ['admin:*'],
      exp : null,
      createdAt: new Date()
    },
    console_google_user__console_grant : {
      id : '7362ydu3kkk3u65uej3mmsi4',
      app : 'console',
      user : 'console_user@berlingskemedia.dk',
      scope : [],
      exp : null,
      createdAt: new Date()
    },
    valid_app_grant: {
      id: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
      app: 'valid-app',
      user: 'xyx@berlingskemedia.dk',
      scope: []
    },
    delete_me_app_grant: {
      id: 'jhfgs294723ijsdhfsdfhskjh329423798animal',
      app: 'delete-me-app',
      user: 'xyx@berlingskemedia.dk',
      scope: []
    },
    simple_first_user_bt_grant: {
      id: 'somerandomsdhjfkjlhsdfkjhsd',
      app: 'bt',
      user: 'first_user@berlingskemedia.dk',
      scope: []
    }
  }
};
