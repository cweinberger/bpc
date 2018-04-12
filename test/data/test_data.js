/* jshint node: true */
'use strict';

module.exports = {

  users: {
    simple_first_user: {
      id: '3218736128736123215732',
      email: 'first_user@berlingskemedia.dk',
      gigya: {
        UID: '3218736128736123215732',
        email: 'first_user@berlingskemedia.dk'
      },
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
      id: '5347895384975934842757',
      email: 'second_user@berlingskemedia.dk',
      gigya: {
        UID: '5347895384975934842757',
        email: 'second_user@berlingskemedia.dk'
      },
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
    simple_third_user: {
      id: 'THIRD_USER@berlingskemedia.dk',
      email: 'third_user@berlingskemedia.dk',
      gigya: {
        UID: '5347895384975934842758',
        email: 'third_user@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {
        'bt': {
          bt_paywall: true,
          bt_subscription_tier: 'premium',
          third_user: true
        },
        'berlingske': {
          berlingske_paywall: true,
          berlingske_subscription_tier: 'premium'
        }
      }
    },
    user_with_no_datascopes: {
      id: 'user_with_no_datascopes',
      email: 'user_with_no_datascopes@berlingskemedia.dk',
      gigya: {
        UID: '5347895384975934842759',
        email: 'user_with_no_datascopes@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {
      }
    },
    mkoc_user: {
      id: '117880216634946654515',
      gigya: {
        UID: '5347895384975934842757',
        email: 'mkoc@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {}
    }
  },

  applications: {
    console: {
      id: 'console',
      scope: ['admin', 'admin:*'],
      key: 'j4h2kj4h32lkh432lkh4dk32ljh4lk32djh4lkj32h4',
      algorithm: 'sha256'
    },
    bt: {
      id: 'bt',
      scope: ['bt', 'non_persisted_scope'],
      key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
      algorithm: 'sha256',
      settings: {
        includeScopeInPrivatExt: true
      }
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
        'business:all',
        'bt:all'
      ],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256',
      settings: {
        includeScopeInPrivatExt: true
      }
    },
    valid_google_app: {
      id: 'valid-google-app',
      scope: [
        'business:all',
        'bt:all'
      ],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256',
      settings: {
        provider: 'google'
      }
    },
    delete_me_app: {
      id: 'delete-me-app',
      scope: [],
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
    app_with_admin_scope: {
      id: 'app_with_admin_scope',
      scope: ['admin'],
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
      settings: {
        provider: 'gigya'
      }
    },
    app_with_no_scopes: {
      id: 'app_with_no_scopes',
      scope: [],
      key: 'fsdfsdfn7eyhsgdhjsgnweyi4t7syeir7bytise7rbe',
      algorithm: 'sha256',
      settings: {
        provider: 'gigya'
      }
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
    },
    user_with_no_datascopes_grant: {
      id: 'sdsadasdfvcxdfsfsd',
      app: 'app_with_no_scopes',
      user: 'user_with_no_datascopes@berlingskemedia.dk',
      scope: []
    }
  },

  deleted_users: {}
};
