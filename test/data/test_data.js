/* jshint node: true */
'use strict';

const ObjectID = require('mongodb').ObjectID;

module.exports = {

  
  users: {
    simple_first_user: {
      _id: new ObjectID("5b3211fd4e094108d0e8a781"),
      id: '3218736128736123215732',
      email: 'first_user@berlingskemedia.dk',
      provider: 'gigya',
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
      _id: new ObjectID("5b3211fd4e094108d0e8a782"),
      id: '5347895384975934842757',
      email: 'second_user@berlingskemedia.dk',
      provider: 'gigya',
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
      _id: new ObjectID("5b3212844e094108d0e8a783"),
      id: 'third_user@berlingskemedia.dk',
      email: 'third_user@berlingskemedia.dk',
      provider: 'gigya',
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
      _id: new ObjectID("5b32128d4e094108d0e8a784"),
      id: 'user_with_no_datascopes',
      email: 'user_with_no_datascopes@berlingskemedia.dk',
      provider: 'gigya',
      gigya: {
        UID: '5347895384975934842759',
        email: 'user_with_no_datascopes@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {
      }
    },
    mkoc_user: {
      _id: new ObjectID("5b3212954e094108d0e8a785"),
      id: '117880216634946654515',
      email: 'mkoc@berlingskemedia.dk',
      provider: 'gigya',
      gigya: {
        UID: '117880216634946654515',
        email: 'mkoc@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {}
    },
    xyz_user: {
      _id: new ObjectID("5b32129f4e094108d0e8a786"),
      id: '137802111134346654517',
      email: 'xyx@berlingskemedia.dk',
      provider: 'gigya',
      gigya: {
        UID: '137802111134346654517',
        email: 'xyx@berlingskemedia.dk'
      },
      lastLogin: new Date(),
      dataScopes: {}
    },
    console_admin: {
      _id: new ObjectID("5b32129f4e094108d0e8a787"),
      id: '6765636276327632763517531',
      email: 'console_admin@berlingskemedia.dk',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {}
    },
    console_user: {
      _id: new ObjectID("5b32129f4e094108d0e8a788"),
      id: '4378638756232438756874365',
      email: 'console_user@berlingskemedia.dk',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {}
    },
    console_user_two: {
      _id: new ObjectID("5b32129f4e094108d0e8a789"),
      id: '4378638756232438756874366',
      email: 'console_user2@berlingskemedia.dk',
      provider: 'google',
      lastLogin: new Date(),
      dataScopes: {}
    }
  },


  applications: {
    console: {
      id: 'console',
      scope: ['admin', 'admin:*'],
      key: 'j4h2kj4h32lkh432lkh4dk32ljh4lk32djh4lkj32h4',
      algorithm: 'sha256',
      settings: {
        provider: 'google'
      }
    },
    bt: {
      id: 'bt',
      scope: ['bt', 'non_persisted_scope'],
      key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
      algorithm: 'sha256',
      settings: {
        includeScopeInPrivatExt: true,
        provider: 'gigya'
      }
    },
    berlingske: {
      id: 'berlingske',
      scope: ['berlingske'],
      key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyi',
      algorithm: 'sha256',
      settings: {
        provider: 'gigya'
      }
    },
    berlingske_read_app: {
      id: 'berlingske_read_app',
      scope: ['berlingske:read'],
      key: 'witf745itwn7ey4otnw7eyi4t7syeir7bytise7rbyy',
      algorithm: 'sha256',
      settings: {
        provider: 'gigya'
      }
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
        provider: 'gigya',
        allowAutoCreationGrants: true,
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
        provider: 'google',
        allowAutoCreationGrants: true,
      }
    },
    delete_me_app: {
      id: 'delete-me-app',
      scope: [],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256'
    },
    app_that_disallowAutoCreationGrants: {
      id: 'app_that_disallowAutoCreationGrants',
      scope: [],
      delegate: false,
      key: 'something_long_and_random',
      algorithm: 'sha256',
      settings: {
        provider: 'gigya',
        allowAutoCreationGrants: false
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
        provider: 'gigya',
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
    },
    app_with_email_masks: {
      id: 'app_with_email_masks',
      scope: [],
      key: 'fssdfn7eyhjhkjthergnweyi4t7syeir7bytyuuygbe',
      algorithm: 'sha256',
      settings: {
        provider: 'gigya',
        allowAutoCreationGrants: true,
        allowEmailMasksRsvp: [
          '@validdomain.nl',
          '@anothervaliddomain.nl'
        ]
      }
    }
  },


  grants: {
    console_superadmin_google_user__console_grant : {
      id : '7462ydu3jjj3u32uej3mmsi3',
      app : 'console',
      user : new ObjectID("5b32129f4e094108d0e8a787"),
      scope : ['admin:*'],
      exp : null,
      createdAt: new Date()
    },
    console_google_user__console_grant : {
      id : '7362ydu3kkk3u65uej3mmsi4',
      app : 'console',
      user : new ObjectID("5b32129f4e094108d0e8a788"),
      scope : [],
      exp : null,
      createdAt: new Date()
    },
    console_google_user_two__console_grant : {
      id : '7362ydu3kkk3u65uej3mmsi6',
      app : 'console',
      user : new ObjectID("5b32129f4e094108d0e8a789"),
      scope : [],
      exp : null,
      createdAt: new Date()
    },
    valid_app_grant: {
      id: 'jhfgs294723ijsdhfsdfhskjh329423798wsdyre',
      app: 'valid-app',
      user: new ObjectID("5b32129f4e094108d0e8a786"),
      scope: []
    },
    delete_me_app_grant: {
      id: 'jhfgs294723ijsdhfsdfhskjh329423798animal',
      app: 'delete-me-app',
      user: new ObjectID("5b32129f4e094108d0e8a786"),
      scope: []
    },
    simple_first_user_bt_grant: {
      id: 'somerandomsdhjfkjlhsdfkjhsd',
      app: 'bt',
      user: new ObjectID("5b3211fd4e094108d0e8a781"),
      scope: []
    },
    simple_second_user_bt_grant: {
      id: 'somerandomsdhjydhddkxhdbhsd',
      app: 'bt',
      user: new ObjectID("5b3211fd4e094108d0e8a782"),
      scope: []
    },
    simple_second_user_berlingske_grant: {
      id: 'somerandomsdhjydhddkxhdbhse',
      app: 'berlingske',
      user: new ObjectID("5b3211fd4e094108d0e8a782"),
      scope: []
    },
    user_with_no_datascopes_grant: {
      id: 'sdsadasdfvcxdfsfsd',
      app: 'app_with_no_scopes',
      user: new ObjectID("5b32128d4e094108d0e8a784"),
      scope: []
    },
    simple_first_user_of_berlingske_readonly_app_grant: {
      id: 'vbcplvxpclpvlxcjkf',
      app: 'berlingske_read_app',
      user: new ObjectID("5b3211fd4e094108d0e8a781"),
      scope: []
    }
  },


  deleted_users: {},


  audit: {}
};
