(function () {
  'use strict';

  angular.module('dimApp')
    .factory('dimBungieService', BungieService);

  BungieService.$inject = ['$http', '$q', 'dimConfig'];

  function BungieService($http, $q, dimConfig) {
    var vaultData = null;
    var inventoryData = null;
    var destinyUserData = null;
    var platformUserData = null;
    var bungieUserData = null;

    return {
      loadBungieNetUser: loadBungieNetUser,
      loadDestinyUser: loadDestinyUser,
      loadPlatformUser: loadPlatformUser,
      loadDestinyStores: loadDestinyStores,
      getUser: getUser,
      getStores: getStores
    };

    function getUser() {
      return {
        platform: platformUserData,
        destiny: destinyUserData
      };
    }

    function getStores() {
      return {
        vault: vaultData,
        destiny: inventoryData
      };
    }

    function loadPlatformUser() {
      return loadBnetCookies()
        .then(getBungleToken)
        .then(generatePlatformUserReq)
        .catch(loadStoresFailed);
    }

    function generatePlatformUserReq(token) {
      return $q(function (resolve, reject) {
        var request = {
          method: 'GET',
          url: 'https://www.bungie.net/Platform/Destiny/Tiger' + (dimConfig.active.type == 1 ? 'Xbox' : 'PSN') + '/Account/' + dimConfig.membershipId + '/',
          headers: {
            'X-API-Key': '57c5ff5864634503a0340ffdfbeb20c0',
            'x-csrf': token
          },
          withCredentials: true
        };

        window.setTimeout(function () {
          $http(request)
            .success(function (data, status, headers, config) {
              if (_.size(data.Response) === 0) {
                reject(data);
              }

              platformUserData = data;

              // inventoryData = _.indexBy(data.Response.data.characters, function (item) {
              //   return item.characterBase.characterId;
              // });

              resolve(data);
            })
            .error(function (data) {
              reject(data);
            });
        }, 0);
      });
    }

    function loadDestinyUser() {
      return loadBnetCookies()
        .then(getBungleToken)
        .then(generateDestinyUserReq)
        .catch(loadStoresFailed);
    }

    function generateDestinyUserReq(token) {
      return $q(function (resolve, reject) {
        var request = {
          method: 'GET',
          url: 'https://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/' + dimConfig.active.type + '/' + dimConfig.active.id + '/',
          headers: {
            'X-API-Key': '57c5ff5864634503a0340ffdfbeb20c0',
            'x-csrf': token
          },
          withCredentials: true
        };

        window.setTimeout(function () {
          $http(request)
            .success(function (data, status, headers, config) {
              destinyUserData = data;

              if (_.size(data.Response) === 0) {
                reject(data);
              }

              resolve(data);
            })
            .error(function (data) {
              reject(data);
            });
        }, 0);
      });
    }

    function loadDestinyStores() {
      var vaultPromise = loadBnetCookies()
        .then(getBungleToken)
        .then(loadBnetVault)
        .catch(loadStoresFailed);
      var inventoryPromise = loadBnetCookies()
        .then(getBungleToken)
        .then(loadBnetInventory)
        .catch(loadStoresFailed);

      return $q.all([vaultPromise, inventoryPromise]);
    }

    function loadBnetVault(token) {
      return $q(function (resolve, reject) {
        var request = {
          method: 'GET',
          url: 'https://www.bungie.net/Platform/Destiny/' + dimConfig.active.type + '/MyAccount/Vault/?definitions=true',
          headers: {
            'X-API-Key': '57c5ff5864634503a0340ffdfbeb20c0',
            'x-csrf': token
          },
          withCredentials: true
        };

        window.setTimeout(function () {
          $http(request)
            .success(function (data, status, headers, config) {
              vaultData = data;
              resolve(data);
            })
            .error(function (data) {
              reject(data);
            });
        }, 0);
      });
    }

    function loadBnetInventory(token) {
      var promises = [];

      inventoryData = {};

      _.each(dimConfig.characterIds, function (characterId) {
        var p = $q(function (resolve, reject) {
          var request = {
            method: 'GET',
            url: 'https://www.bungie.net/Platform//Destiny/' + dimConfig.active.type + '/Account/' + dimConfig.membershipId + '/Character/' + characterId + '/Inventory/?definitions=true',
            headers: {
              'X-API-Key': '57c5ff5864634503a0340ffdfbeb20c0',
              'x-csrf': token
            },
            withCredentials: true
          };

          window.setTimeout(function () {
            $http(request)
              .success(function (data, status, headers, config) {
                data.Response.characterId = characterId;
                inventoryData[characterId] = data.Response;
                resolve(data.Response);
              })
              .error(function (data) {
                reject(data);
                return;
              });
          }, 0);
        });

        promises.push(p);
      });

      return $q.all(promises);
    }

    function loadStoresFailed(response) {
      throw 'XHR Failed for loadBungieStores. ' + response;
    }

    function loadBungieNetUser() {
      return loadBnetCookies()
        .then(getBungleToken)
        .then(loadBnetUser)
        .catch(loadUserFailed);

      function loadBnetUser(token) {
        return $q(function (resolve, reject) {
          var request = {
            method: 'GET',
            url: 'https://www.bungie.net/Platform/User/GetBungieNetUser/',
            headers: {
              'X-API-Key': '57c5ff5864634503a0340ffdfbeb20c0',
              'x-csrf': token
            },
            withCredentials: true
          };

          window.setTimeout(function () {
            $http(request)
              .success(function (data, status, headers, config) {
                bungieUserData = data;
                resolve(data);
              })
              .error(function (data) {
                reject(data);
              });
          }, 0);
        });
      }

      function loadUserFailed(response) {
        throw 'XHR Failed for loadBungieNetUser. ' + response;
      }
    }

    function loadBnetCookies() {
      return $q(function (resolve, reject) {
        chrome.cookies.getAll({
          'domain': '.bungie.net'
        }, getAllCallback);

        function getAllCallback(cookies) {
          if (_.size(cookies) > 0) {
            resolve(cookies);
          } else {
            reject('No cookies found.');
          }
        }
      });
    }

    function getBungleToken(cookies) {
      return $q(function (resolve, reject) {
        var cookie = _.find(cookies, function (cookie) {
          return cookie.name === 'bungled';
        });

        if (!_.isUndefined(cookie)) {
          resolve(cookie.value);
        } else {
          chrome.tabs.create({
            url: 'http://bungie.net',
            active: false
          });

          setTimeout(function () {
            window.location.reload();
          }, 5000);

          reject('No bungled cookie found.');
        }
      });
    }
  }
})();
