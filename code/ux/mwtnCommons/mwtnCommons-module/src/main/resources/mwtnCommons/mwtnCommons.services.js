/*
 * Copyright (c) 2016 highstreet technologies GmbH and others. All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */

if (!String.prototype.contains) { 
  String.prototype.contains = function(it) { 
    return this.indexOf(it) != -1; 
  }; 
}

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

if (!Array.prototype.contains) {
  Array.prototype.contains = function (v) {
    return this.indexOf(v) > -1;
  };
}

if (!Array.prototype.clean) {
  Array.prototype.clean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == deleteValue) {         
        this.splice(i, 1);
        i--;
      }
    }
    return this;
  };
}

define(
    [ 'app/mwtnCommons/mwtnCommons.module' ],
    function(mwtnCommonsApp) {

      mwtnCommonsApp.register.factory('$mwtnCommons', function($http, $q,  ENV, $mwtnLog, $mwtnDatabase) {
        
        var COMPONENT = '$mwtnCommons';
        
        var doSynchronousLoop = function (data, processData, done) {
          if (data.length > 0) {
            var loop = function(data, i, processData, done) {
              processData(data[i], i, function() {
                if (++i < data.length) {
                  loop(data, i, processData, done);
                } else {
                  done();
                }
              });
            };
            loop(data, 0, processData, done);
          } else {
            done();
          }
        };         

        var service = {
          base : ENV.getBaseURL("MD_SAL") + "/restconf/"
        };

        service.getData = function(callback) {
          return callback('$mwtnCommons registered to this application.');
        };
        
        service.getType = function(value) {
          var result = typeof value;
          if (result === 'object' && JSON.stringify(value).substring(0,1) === '[') {
            result = 'array';
          }
          return result;
        };

        service.getLayer = function(pacId) {
          switch (pacId) {
          case 'airinterface':
            return 'MWPS';
            break;
          case 'structure':
          case 'pureEthernetStructure':
          case 'hybridSturcture':
            return 'MWS';
            break;
          case 'ethernetContainer':
          case 'tdmContainer':
          case 'container':
            return 'ETH-CTP';
            break;
          default:
            return (pacId);
          }
        };
        service.parts = ['Capability', 'Configuration', 'Status', 'CurrentProblems', 'CurrentPerformance', 'HistoricalPerformances'];
        
        service.getLabelId = function(key, callback) {
          return  callback(['mwtn', key].join('_').toUpperCase());
        };
        
        service.checkModules = function(names) {
          // accepts a list of module names and
          // attempts to load them, in order.

          // attempt to load the module into m
          var m;
          var result = {};
          names.map(function(name){
            try {
              m = angular.module(name);
              result[name] = true;
            } catch(err) {
              result[name] = false;
            }
          });
          return result;
        };
        
        service.mount = function(mp) {
          // mp: mounting point

          var url = [ service.base, service.url.mount()].join('');
          var xml = [
            '<module xmlns="urn:opendaylight:params:xml:ns:yang:controller:config">',
            '<type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">prefix:sal-netconf-connector</type>',
            '<name>{0}</name>',
            '<address xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">{1}</address>',
            '<port xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">{2}</port>',
            '<username xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">{3}</username>',
            '<password xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">{4}</password>',
            '<tcp-only xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">false</tcp-only>',
            '<event-executor xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:netty">prefix:netty-event-executor</type>',
            '  <name>global-event-executor</name>',
            '</event-executor>',
            '<binding-registry xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:md:sal:binding">prefix:binding-broker-osgi-registry</type>',
            '  <name>binding-osgi-broker</name>',
            '</binding-registry>',
            '<dom-registry xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:md:sal:dom">prefix:dom-broker-osgi-registry</type>',
            '  <name>dom-broker</name>',
            '</dom-registry>',
            '<client-dispatcher xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:config:netconf">prefix:netconf-client-dispatcher</type>',
            '  <name>global-netconf-dispatcher</name>',
            '</client-dispatcher>',
            '<processing-executor xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:threadpool">prefix:threadpool</type>',
            '  <name>global-netconf-processing-executor</name>',
            '</processing-executor>',
            '<keepalive-executor xmlns="urn:opendaylight:params:xml:ns:yang:controller:md:sal:connector:netconf">',
            '  <type xmlns:prefix="urn:opendaylight:params:xml:ns:yang:controller:threadpool">prefix:scheduled-threadpool</type>',
            '  <name>global-netconf-ssh-scheduled-executor</name>',
            '</keepalive-executor>', 
            '</module>' ].join('').format(mp.name, mp.ipaddress, mp.port, mp.username, mp.password);

            var request = {
              method : 'POST',
              url : url,
              headers: {
                'Content-Type': 'application/xml',
                'Accept': 'application/xml'
              },
              data : xml
            };

            var deferred = $q.defer();
            $http(request).then(function(success) {
              deferred.resolve(success.data);
            }, function(error) {
              $mwtnLog.error({component: '$mwtnCommons.mount', message: JSON.stringify(error.data)});
              deferred.reject(error);
            });
            return deferred.promise;
        };

        service.unmount = function(nodeId) {
          var url = [service.base,
              'config/network-topology:network-topology/topology/topology-netconf/node/controller-config/yang-ext:mount/config:modules/module/odl-sal-netconf-connector-cfg:sal-netconf-connector/',
              nodeId].join('');
          var request = {
            method : 'DELETE',
            url : url
          };
          var deferred = $q.defer();
          $http(request).then(function(success) {
            $mwtnLog.info({component: COMPONENT, message: 'Mounting Point deleted: ' + nodeId});
            deferred.resolve(success.data);
          }, function(error) {
            $mwtnLog.info({component: '$mwtnCommons.unmount', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.getPacParts = function(spec) {
          var errorMsg = {info:'No data received'};
          var deferred = $q.defer();
          switch (spec.pacId){
          case 'ne':
            service.getActualNetworkElement(spec.nodeId, spec.revision).then(function(success){
              deferred.resolve(success);
            }, function(error){
              $mwtnLog.error({component: COMPONENT, message: 'Requesting ' + spec.nodeId + ' failed!'});
              deferred.reject(errorMsg);
            });
            break;
          case 'ltp':
            var odlRequest = {
              method: 'GET',
              url: [service.url.actualNetworkElement(spec.nodeId, spec.revision), '_ltpRefList', spec.layerProtocolId].join('/')
            };
            service.genericRequest(odlRequest).then(function(success){
              deferred.resolve(success);
            }, function(error){
              $mwtnLog.error({component: COMPONENT, message: 'Requesting LTPs of ' + spec.nodeId + ' failed!'});
              deferred.reject(errorMsg);
            });
            break;
          case 'MWPS':
          case 'MWS':
          case 'ETH-CTP':
          case 'airinterface':
          case 'structure':
          case 'container':
            if (spec.partId) {
              service.getConditionalPackagePart(spec).then(function(success){
                success.layerProtocol = spec.layerProtocolId;
                deferred.resolve(success);
              }, function(error){
                $mwtnLog.error({component: COMPONENT, message: 'Requesting conditional package of ' + JSON.stringify(spec) + ' failed!'});
                deferred.reject(errorMsg);
              });
            }
            break;
          default:
            $mwtnLog.error({component: COMPONENT, message: 'Requesting ' + spec.pacId + ' not supported!'});
            deferred.reject(errorMsg);
          }
          return deferred.promise;
        };

        service.setPacParts = function(spec, data) {
          var errorMsg = {info:'No data received'};
          var deferred = $q.defer();
          switch (spec.pacId){
//          case 'ne':
//            service.getActualNetworkElement(spec.nodeId, spec.revision).then(function(success){
//              deferred.resolve(success);
//            }, function(error){
//              $mwtnLog.error({component: COMPONENT, message: 'Requesting ' + spec.nodeId + ' failed!'});
//              deferred.reject(errorMsg);
//            });
//            break;
//          case 'ltp':
//            var odlRequest = {
//              method: 'GET',
//              url: [service.url.actualNetworkElement(spec.nodeId, spec.revision), '_ltpRefList', spec.layerProtocolId].join('/')
//            };
//            service.genericRequest(odlRequest).then(function(success){
//              deferred.resolve(success);
//            }, function(error){
//              $mwtnLog.error({component: COMPONENT, message: 'Requesting LTPs of ' + spec.nodeId + ' failed!'});
//              deferred.reject(errorMsg);
//            });
//            break;
          case 'airinterface':
          case 'structure':
          case 'container':
            if (spec.partId) {
              service.setConditionalPackagePart(spec, data).then(function(success){
                deferred.resolve(success);
              }, function(error){
                $mwtnLog.error({component: COMPONENT, message: 'Modification of ' + JSON.stringify(spec) + ' failed!'});
                deferred.reject(errorMsg);
              });
            }
            break;
          default:
            $mwtnLog.error({component: COMPONENT, message: 'Modification of ' + spec.pacId + ' not supported!'});
            deferred.reject(errorMsg);
          }
          return deferred.promise;
        };

        service.setPacPartLists = function(spec, listData) {
          var errorMsg = {info:'No data received'};
          var deferred = $q.defer();
          switch (spec.pacId){
//          case 'ne':
//            service.getActualNetworkElement(spec.nodeId, spec.revision).then(function(success){
//              deferred.resolve(success);
//            }, function(error){
//              $mwtnLog.error({component: COMPONENT, message: 'Requesting ' + spec.nodeId + ' failed!'});
//              deferred.reject(errorMsg);
//            });
//            break;
//          case 'ltp':
//            var odlRequest = {
//              method: 'GET',
//              url: [service.url.actualNetworkElement(spec.nodeId, spec.revision), '_ltpRefList', spec.layerProtocolId].join('/')
//            };
//            service.genericRequest(odlRequest).then(function(success){
//              deferred.resolve(success);
//            }, function(error){
//              $mwtnLog.error({component: COMPONENT, message: 'Requesting LTPs of ' + spec.nodeId + ' failed!'});
//              deferred.reject(errorMsg);
//            });
//            break;
          case 'airinterface':
          case 'structure':
          case 'container':
            if (spec.partId === 'Configuration') {
              service.setConditionalPackagePartList(spec, listData).then(function(success){
                deferred.resolve(success);
              }, function(error){
                $mwtnLog.error({component: COMPONENT, message: 'Modification of ' + JSON.stringify(spec) + ' failed!'});
                deferred.reject(errorMsg);
              });
            }
            break;
          default:
            $mwtnLog.error({component: COMPONENT, message: 'Modification of ' + spec.pacId + ' not supported!'});
            deferred.reject(errorMsg);
          }
          return deferred.promise;
        };

        var nodeIntId = 100;
        service.getNodeIntIdFromNodeId = function(nodeId) {
          nodeIntId = nodeIntId + 1;
          if (nodeId.contains('-')) {
            return nodeId.split('-')[1]; 
          }
          return nodiIntId;
        };

        service.getRequiredNetworkElements = function(complete) {
          var deferred = $q.defer();
          $mwtnDatabase.getAllData('required-networkelement', 0, 999, undefined).then(function(success){
            if (complete) {
              deferred.resolve(success.data.hits.hits); 
            }
            var result = success.data.hits.hits.map(function(ne){
              var radioSignalIds = [];
              ne._source.MW_AirInterface_Pac.map(function(mwps){
                radioSignalIds.push(mwps.airInterfaceConfiguration.radioSignalID);
              });
              
              return {
                id: service.getNodeIntIdFromNodeId(ne._source.nodeId),
                name: ne._source.nodeId,
                ipaddress: ne._source.connect.host,
                port: ne._source.connect.port,
                username: ne._source.connect.username,
                password: ne._source.connect.password,
                radioSignalIds: JSON.stringify(radioSignalIds),
                connectionStatus: 'disconnected'
              };
            });
            deferred.resolve(result);         
          }, function(error){
            $mwtnLog.error({component: COMPONENT, message: 'Problems in retrieving required network elements.'});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        
        service.getConnectionStatus = function(neId) {
          var url = service.base + service.url.connectionStatus(neId);
          var request = {
            method : 'GET',
            url : url
          };
          var deferred = $q.defer();
          $http(request).then(function(success) {
            // console.log(JSON.stringify(success));
            deferred.resolve(success.data.node[0]['netconf-node-topology:connection-status']);
          }, function(error) {
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.executeClosedLoopAutomation = function() {
            var url = service.base+'operations/closedLoopAutomation:start';
            var request = {
                method : 'POST',
                url : url
            };
            var deferred = $q.defer();

            $http(request).then(function(success) {
               deferred.resolve(success);
            }, function(error) {
               deferred.reject(error);
            });
            return deferred.promise;
        }

        service.saveClosedLoopAutomation = function(enabled, option) {
            var url = service.base+'operations/closedLoopAutomation:save-timer';
            var request = {
                method : 'POST',
                url : url,

                data : {
                   "input" : {
                     "enabled" : enabled,
                     "option" : option
                   }
                }
            };
            var deferred = $q.defer();

            $http(request).then(function(success) {
               deferred.resolve(success);
            }, function(error) {
               deferred.reject(error);
            });
            return deferred.promise;
        };

        service.readClosedLoopAutomation = function() {
            var url = service.base+'operations/closedLoopAutomation:read-timer';
            var request = {
                method : 'POST',
                url : url,
            };
            var deferred = $q.defer();

            $http(request).then(function(success) {
               deferred.resolve(success);
            }, function(error) {
               deferred.reject(error);
            });
            return deferred.promise;
        };

        service.getActualNetworkElements = function() {
          var url = service.base + service.url.actualNetworkElements();
          var request = {
            method : 'GET',
            url : url
          };
          var deferred = $q.defer();
          $http(request).then(function(success) {
            success.data.topology.map(function(topo){
              if (topo['topology-id'] === 'topology-netconf') {
                var mwNes = topo.node.map(function(ne){
                  if (ne['node-id'] !== 'controller-config') {
                    return ne;
                  }
                });
                deferred.resolve(mwNes.clean(null));
              }
            });
          }, function(error) {
            $mwtnLog.error({component: COMPONENT, message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.separator = '&nbsp;';

        // grid settings
        service.highlightFilteredHeader = function(row, rowRenderIndex,
            col, colRenderIndex) {
          if (col.filters[0].term) {
            return 'header-filtered';
          } else {
            return '';
          }
        };
        service.gridOptions = {
          data : [],
          enableColumnResizing : true,
          enableSorting : true,
          enableFiltering : true,
          enableGridMenu : true,
          exporterMenuPdf: false,
          showGridFooter : true,
          // showColumnFooter: true,
          fastWatch : true,
          enableRowSelection : true,
          enableRowHeaderSelection : true,
          multiSelect : false
        };
        service.gridOptions.gridMenuCustomItems = [ {
          title : 'Rotate Grid',
          action : function($event) {
            this.grid.element.toggleClass('rotated');
          },
          order : 210
        } ];

        service.url = {
          actualNetworkElements : function() {
            return 'operational/network-topology:network-topology/topology/topology-netconf';
          },
          connectionStatus : function(neId) {
            return 'operational/network-topology:network-topology/topology/topology-netconf/node/' + neId;
          },
          mount : function() {
            return 'config/network-topology:network-topology/topology/topology-netconf/node/controller-config/yang-ext:mount/config:modules';
          },
          actualNetworkElement : function(neId, revision) {
            switch (revision) {
            case "2016-03-23":
              return [
                      'operational/network-topology:network-topology/topology/topology-netconf/node/',
                      neId,
                      '/yang-ext:mount/CoreModel-CoreNetworkModule-ObjectClasses:NetworkElement/',
                      neId ].join('');
              break;
            default:
              return [
                      'operational/network-topology:network-topology/topology/topology-netconf/node/',
                      neId,
                      '/yang-ext:mount/CoreModel-CoreNetworkModule-ObjectClasses:NetworkElement'].join('');
            }
          }
        };

        service.genericRequest = function(odlRequest) {
          var url = [ service.base, odlRequest.url].join('');
          var request = {
            method : odlRequest.method,
            url : url,
            data : odlRequest.data
          };

          var deferred = $q.defer();
          $http(request).then(function(success) {
            deferred.resolve(success);
          }, function(error) {
            $mwtnLog.error({component: COMPONENT + '.genericRequest', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.getMountedNetConfServers = function(callback) {
          var url = service.base + service.url.actualNetworkElements();
          var request = {
            method : 'GET',
            url : url
          };
          $http(request).then(function(success) {
            return callback(success.data);
          }, function(error) {
            console.error(JSON.stringify(error));
            return callback();
          });
        };

        service.getActualNetworkElement = function(neId, revision) {

          var url = [service.base,
              service.url.actualNetworkElement(neId, revision)].join('');
          var request = {
            method : 'GET',
            url : url
          };
          var taskId = [neId, 'ONF:CoreModel:NetworkElement data received'].join(' ');
          
          var deferred = $q.defer();
          console.time(taskId);
          $http(request).then(function(success) {
            console.timeEnd(taskId);
            success.data.revision = revision;
            deferred.resolve(success.data);
          }, function(error) {
            console.timeEnd(taskId);
            $mwtnLog.info({component: '$mwtnCommons.getActualNetworkElement', message: JSON.stringify(error.data)});
            deferred.reject(error);
           });
          return deferred.promise;
        };

        var getIdsByRevision = function(revision, pacId, partId) {
          
          if (revision === '2016-03-23') {
            switch (pacId) {
              case 'MWPS':
              case 'AirInterface':
              case 'airinterface':
              case 'airInterface':
                pacId = 'MicrowaveModel-ObjectClasses-MwConnection:MW_AirInterface_Pac';
                partId = 'airInterface' + partId;
                if (partId === 'airInterfaceCapability' || partId === 'airInterfaceCurrentProblems') {
                  partId = undefined;
                }
                break;
              case 'MWS':
              case 'Structure':
              case 'structure':
                pacId = 'MicrowaveModel-ObjectClasses-MwConnection:MW_Structure_Pac';
                partId = 'structure' + partId;
                break;
              case 'ETH-CTP':
              case 'Container':
              case 'container':
                pacId = 'MicrowaveModel-ObjectClasses-MwConnection:MW_Container_Pac';
                partId = 'container' + partId;
                break;
            }
          } else {
            switch (pacId) {
              case 'MWPS':
              case 'AirInterface':
              case 'airinterface':
              case 'airInterface':
                pacId = 'MicrowaveModel-ObjectClasses-AirInterface:MW_AirInterface_Pac';
                partId = 'airInterface' + partId;
                break;
              case 'MWS':
              case 'Structure':
              case 'structure':
                pacId = 'MicrowaveModel-ObjectClasses-PureEthernetStructure:MW_PureEthernetStructure_Pac';
                partId = 'pureEthernetStructure' + partId;
                break;
              case 'ETH-CTP':
              case 'Container':
              case 'container':
                pacId = 'MicrowaveModel-ObjectClasses-EthernetContainer:MW_EthernetContainer_Pac';
                partId = 'ethernetContainer' + partId;
                break;
            }
          }
          return {
            pacId: pacId,
            partId: partId
          }
        };
        
        service.getConditionalPackagePart = function(spec) {
          //console.log(JSON.stringify(spec));
          var deferred = $q.defer();
          if(!spec.partId) {
            deferred.reject('ignore');
            return deferred.promise;
          }
          
          var ids = getIdsByRevision(spec.revision, spec.pacId, spec.partId);
          
          var url = [service.base,
              'operational/network-topology:network-topology/topology/topology-netconf/node/',
              spec.nodeId,
              '/yang-ext:mount/',ids.pacId,'/',
              spec.layerProtocolId, '/', 
              ids.partId].join('');
          var request = {
            method : 'GET',
            url : url
          };
          // console.log(JSON.stringify(request));
                    
          var taskId = [spec.nodeId, spec.layerProtocolId, spec.pacId, 'data received'].join(' ');
          console.time(taskId);
          $http(request).then(function(success) {
            console.timeEnd(taskId);
            success.data.revision = spec.revision;
            deferred.resolve(success.data);
          }, function(error) {
            console.timeEnd(taskId);
            $mwtnLog.info({component: '$mwtnCommons.getConditionalPackagePart', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        
        service.setConditionalPackagePart = function(spec, data) {
          var deferred = $q.defer();
          if(!spec.partId) {
            deferred.reject('ignore');
            return deferred.promise;
          }
          
          var ids = getIdsByRevision(spec.revision, spec.pacId, spec.partId);
          var body = {};
          body[ids.partId] = data;
          
          var url = [service.base,
              'config/network-topology:network-topology/topology/topology-netconf/node/',
              spec.nodeId,
              '/yang-ext:mount/',ids.pacId,'/',
              spec.layerProtocolId, '/', 
              ids.partId].join('');
          var request = {
              method : 'PUT',
              url : url,
              headers: {
                'Content-Type': 'application/json',
                'Accept' : 'application/json'
              },
              data : body
            };
//          var request = {
//              method : 'PATCH',
//              url : url,
//              headers: {
//                'Content-Type': 'application/yang.patch+json'
//              },
//              data : body
//            };
          // console.log(JSON.stringify(request));
          
          var taskId = [spec.nodeId, spec.layerProtocolId, spec.pacId, 'data received'].join(' ');
          console.time(taskId);
          
          $http(request).then(function(success) {
            console.timeEnd(taskId);
            success.data.revision = spec.revision;
            deferred.resolve(success.data);
          }, function(error) {
            console.timeEnd(taskId);
            $mwtnLog.error({component: '$mwtnCommons.setConditionalPackagePart', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

//     pureEthernetStructureConfiguration/problemKindSeverityList/value1
//     {
//       "problemKindSeverityList": [
//         {
//           "problemKindName": "severity1",
//           "problemKindSeverity": "warning"
//         }
//       ]
//     }
     
       var processData = function(item, i, callback) {
          var spec = item.spec;
          var ids = getIdsByRevision(spec.revision, spec.pacId,
              spec.partId);
          item.spec = undefined;

          var body = {};
          body[spec.attribute] = [ item ];

          $mwtnDatabase.getSchema().then(function(schema) {
            
            var key;
            Object.keys(item).map(function(k){
              // works currently only for single key lists
              if (schema[k] && schema[k]['is-key']) {
                key = k;
              }
            });
           
            var url = [
                service.base.slice(0, -1),
                'config/network-topology:network-topology/topology/topology-netconf/node',
                spec.nodeId, 'yang-ext:mount', ids.pacId,
                spec.layerProtocolId, ids.partId,
                spec.attribute, item[key] ].join('/');
            var request = {
              method : 'PUT',
              url : url,
              headers : {
                'Content-Type' : 'application/json',
                'Accept' : 'application/json'
              },
              data : body
            };
            // console.log(JSON.stringify(request));
            var taskId = [ spec.nodeId, spec.layerProtocolId,
                spec.pacId, item.problemKindName,
                'data received' ].join(' ');
            console.time(taskId);

            $http(request).then(function(success) {
              console.timeEnd(taskId);
              success.data.revision = spec.revision;
              return callback();
            },
            function(error) {
              console.timeEnd(taskId);
              $mwtnLog
                  .error({
                    component : '$mwtnCommons.setConditionalPackagePart',
                    message : JSON
                        .stringify(error.data)
                  });
              return callback();
            });
          });
        };
     
        service.setConditionalPackagePartList = function(spec, data) {
          var deferred = $q.defer();
          if(!spec.partId) {
            deferred.reject('ignore');
            return deferred.promise;
          }
          
          data.map(function(item){
            item.spec = spec;
          });
          
          doSynchronousLoop(data, processData, function(){
            deferred.resolve();
          });
          return deferred.promise;
        };
        
        var saveRequiredNetworkElement = function(requiredNode){
          var url = [ $mwtnDatabase.base, $mwtnDatabase.index, 'required-networkelement',
                      requiredNode.nodeId ].join('/');
          var bodyString = JSON.stringify(requiredNode); 
          var headers = {
              'Content-Type': 'application/json',
              'Content-Length': bodyString.length
          };
          var request = {
            method : 'PUT',
            url : url,
            data : requiredNode
          };
        
          var deferred = $q.defer();
          console.time('database:' + url);
          $http(request).then(function(success) {
            console.timeEnd('database:' + url);
            // console.log(JSON.stringify(success));
            deferred.resolve(success);
          }, function(error) {
            console.timeEnd('database:' + url);
            $mwtnLog.error({component: '$mwtnCommons.addRequiredNetworkElementToDatabase', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };
        service.addRequiredNetworkElement = function(netconfServer) {
          var requiredNode = {
              nodeId: netconfServer['node-id'],
              siteRef: netconfServer.site,
              onfCoreModelRevision: netconfServer.onfCoreModelRevision,
              onfAirIinterfaceRevision: netconfServer.onfAirIinterfaceRevision,
              connect: {
                mountId : netconfServer['node-id'],
                host: netconfServer['netconf-node-topology:host'],
                port: netconfServer['netconf-node-topology:port'],
                username: netconfServer.username,
                password: netconfServer.password
              },
              NetworkElement : {},
              MW_AirInterface_Pac: [],
              MW_PureEthernetStructure_Pac: [],
              MW_EthernetContainer_Pac: []
          };
          
          // get NetworkElement object from node
          var spec = {
              nodeId : requiredNode.nodeId,
              revision: requiredNode.onfCoreModelRevision,
              pacId : 'ne'
          };
          
          var updatePart = function(spec, data) {
            var pacIds = ['MWPS', 'MWS', 'ETH-CTP'];
            var pacNames = ['MW_AirInterface_Pac', 'MW_PureEthernetStructure_Pac', 'MW_EthernetContainer_Pac'];
            var index = pacIds.indexOf(spec.pacId);
            data.layerProtocol = spec.layerProtocolId;
            requiredNode[pacNames[index]].push(data);
          };
          var processLTPs = function(item, i, callback) {
            var spec = {
                nodeId : requiredNode.nodeId,
                revision: requiredNode.onfCoreModelRevision, 
                pacId: item._lpList[0].layerProtocolName,
                layer: item._lpList[0].layerProtocolName,
                layerProtocolId: item._lpList[0].uuid,
                partId: 'Configuration'
              };
              service.getPacParts(spec).then(function(success){
                updatePart(spec, success);
                return callback();
              }, function(error){
                updatePart(spec, error);
                return callback();
              });
          };
          var deferred = $q.defer();
          service.getPacParts(spec).then(function(success){
            requiredNode.NetworkElement = success.NetworkElement;
            
            doSynchronousLoop(success.NetworkElement._ltpRefList, processLTPs, function(){
              saveRequiredNetworkElement(requiredNode).then(function(success){
                deferred.resolve(success);
              }, function(error){
                $mwtnLog.error({component: '$mwtnCommons.saveRequiredNetworkElement', message: JSON.stringify(error.data)});
                deferred.reject(error);
              });
            });
            
          }, function(error){
            $mwtnLog.error({component: '$mwtnCommons.getPacParts', message: JSON.stringify(error.data)});
            deferred.reject(error);
          });
          return deferred.promise;
        };

        var createStream = function(streamName, callback) {
          console.log('streamName', streamName);
          var request = {
            method : 'GET',
            url : [ service.base, 'streams/stream/', streamName ]
                .join('')
          };
          $http(request).then(function successCallback(response) {
            // this callback will be called asynchronously
            // when the response is available
            // console.log(JSON.stringify(response));
            console.log(response.headers('Location'));
            callback(response.headers('Location'));
          }, function errorCallback(response) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
            console.error(JSON.stringify(response));
            callback();
          });
        };
        service.registerForOdlEvents = function(path, callback) {
          var request = {
            method : 'POST',
            url : [ service.base,
                'operations/sal-remote:create-data-change-event-subscription' ]
                .join(''),
            data : {
              "input" : {
                "path" : path,
                "sal-remote-augment:datastore" : "CONFIGURATION",
                "sal-remote-augment:scope" : "SUBTREE"
              }
            }
          };
          $http(request).then(
              function successCallback(response) {
                // this callback will be called asynchronously
                // when the response is available
                // console.log(JSON.stringify(response));
                createStream(response.data.output['stream-name'],
                    function(socketLocation) {
                      callback(socketLocation);
                    });
              }, function errorCallback(response) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
                console.error(JSON.stringify(response));
              });
        };
        
        return service;
      });

      // Service log
      mwtnCommonsApp.register.factory('$mwtnLog', function($http, $q, ENV, $mwtnDatabase) {

        var writeLogToDB = function(data, callback) {
          var url = [ $mwtnDatabase.base, $mwtnDatabase.index, 'log' ].join('/');
          var request = {
            method : 'POST',
            url : url,
            data : {
              timestamp : data.timestamp ? data.timestamp : new Date().toISOString(),
              type : data.type ? data.type : 'info',
              component : data.component ? data.component : 'unkonwn',
              message : data.message
            }
          };
          $http(request).then(function successCallback(response) {
            return callback(true);
          }, function errorCallback(response) {
            console.error(JSON.stringify(response));
            return callback(false);
          });
        };

        var createIndex = function(index, callback) {
          var url = [ $mwtnDatabase.base, index ].join('/');
          var request = {
            method : 'POST',
            url : url,
            data : {
              timestamp : new Date().toISOString(),
              type : 'info',
              component : '$mwtnLog',
              message : 'init log'
            }
          };
          $http(request).then(function(success) {
            return callback(true);
          }, function(error) {
            console.error(JSON.stringify(error));
            return callback(false);
          });
        };

        var checkIndex = function(index, callback) {
          var url = [ $mwtnDatabase.base, index ].join('/');
          var request = {
            method : 'HEAD',
            url : url
          };
          $http(request).then(function successCallback(response) {
            return callback(true);
          }, function errorCallback(response) {
            console.error(JSON.stringify(response));
            createIndex(index, function(created) {
              return callback(created);
            });
          });
        };

        var checkDatabase = function(callback) {
          var url = $mwtnDatabase.base;
          var request = {
            method : 'GET',
            url : url
          };
          $http(request).then(function successCallback(response) {
            checkIndex($mwtnDatabase.index, function(exists) {
              return callback(exists);
            });
          }, function errorCallback(response) {
            console.error(JSON.stringify(response));
            return callback(false);
          });
        };

        var getData = function(type, log) {
          var data = {};
          data.timestamp = new Date().toISOString();
          switch (typeof log) {
          case 'string':
            data.type = type;
            data.component = 'unknown';
            data.message = log;
            break;
          case 'object':
            data.type = type;
            data.component = log.component;
            data.message = log.message;
            break;
          default:
            data.type = 'error';
            data.component = '$mwtnLog';
            data.message = 'MWTN log service is called with wrong parameters.';
          }
          // console.log(JSON.stringify(data));
          return data;
        }

        var service = {
          base : $mwtnDatabase.base
        };

        service.debug = function(log) {
          var data = getData('debug', log);
          checkDatabase(function(isRunning) {
            if (isRunning) {
              writeLogToDB(data, function() {
                // console.log('log stored');
              });
            } else {
              console.error(data.timestamp, service.base,
                  'Database (ElasticSerach) not reachable!?')
            }
          });
          console.log(data.timestamp, JSON.stringify(log));
        };

        service.error = function(log) {
          var data = getData('error', log);
          checkDatabase(function(isRunning) {
            if (isRunning) {
              writeLogToDB(data, function() {
                // console.log('log stored');
              });
            } else {
              console.error(data.timestamp, service.base,
                  'Database (ElasticSerach) not reachable!?')
            }
          });
          console.error(data.timestamp, JSON.stringify(log));
        };

        service.info = function(log) {
          var data = getData('info', log);
          checkDatabase(function(isRunning) {
            if (isRunning) {
              writeLogToDB(data, function() {
                // console.log('log stored');
              });
            } else {
              console.error(data.timestamp, service.base,
                  'Database (ElasticSerach) not reachable!?')
            }
          });
        };

        service.warning = function(log) {
          var data = getData('warning', log);
          checkDatabase(function(isRunning) {
            if (isRunning) {
              writeLogToDB(data, function() {
                // console.log('log stored');
              });
            } else {
              console.error(data.timestamp, service.base,
                  'Database (ElasticSerach) not reachable!?')
            }
          });
          console.warn(data.timestamp, JSON.stringify(log));
        };

        return service;
      });

      // Service Database (ElasticSerach)
      mwtnCommonsApp.register.factory('$mwtnDatabase', function($http, $q, ENV) {

        var service = {
          base : ENV.getBaseURL("MD_SAL").replace(':8181', ':9200'),
          index : 'mwtn',
          command : '_search'
        };
                
        service.genericRequest = function(databaseRequest) {
          console.log(JSON.stringify(databaseRequest));
          var url = [ service.base, service.index, databaseRequest.docType,
                      databaseRequest.command ].join('/');
          var request = {
            method : databaseRequest.method,
            url : url,
            data : {
              from : databaseRequest.from,
              size : databaseRequest.size,
              sort : databaseRequest.sort,
              filter : databaseRequest.filter,
              query : databaseRequest.query
            }
          };
          // console.info(JSON.stringify(request));

          var deferred = $q.defer();
          console.time('database:' + url);
          $http(request).then(function(success) {
            console.timeEnd('database:' + url);
            // console.log(JSON.stringify(success));
            deferred.resolve(success);
          }, function(error) {
            console.timeEnd('database:' + url);
            console.error(error);
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.getAllData = function(docType, from, size, sort) {
          var databaseRequest = {
            method : 'POST',
            command: '_search',
            docType: docType,
            from : from,
            size : size,
            sort : sort,
            query : {
              match_all : {}
            }
          };
          var deferred = $q.defer();
          service.genericRequest(databaseRequest).then(function(success){
            // console.log('getAllData', success);
            deferred.resolve(success);
          }, function(error){
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.getData = function(docType, from, size, sort, filter, query) {
          var databaseRequest = {
            method : 'POST',
            docType: docType,
            from : from,
            size : size,
            sort : sort,
            filter : filter,
            query : query
          };
          var deferred = $q.defer();
          service.genericRequest(databaseRequest).then(function(success){
            deferred.resolve(success);
          }, function(error){
            deferred.reject(error);
          });
          return deferred.promise;
        };
        
        service.deleteDoc = function(docType, id) {
          var databaseRequest = {
            method : 'DELETE',
            docType: docType,
            command: id,
          };
          
          var deferred = $q.defer();
          service.genericRequest(databaseRequest).then(function(success){
            deferred.resolve({status: success.status, logId: success.data._id});
          }, function(error){
            deferred.reject(error);
          });
          return deferred.promise;
        };

        var schemaInformation;
        var inquireSchemaInformation = function(callback){
          var databaseRequest = {
            method: 'GET',
            from: 0,
            size: 999
          };
          var deferred = $q.defer();
          service.getAllData('schema-information', 0, 999, undefined).then(function(success){
            // console.log(JSON.stringify(data.data.hits.hits));
            schemaInformation = {};
            success.data.hits.hits.map(function(hit){
              schemaInformation[hit._id] = hit._source;
            });
            // console.log('got schemaInformation', Object.keys(schemaInformation).length);
            return deferred.resolve(schemaInformation);
          }, function(error){
            deferred.reject(error);
          });
          return deferred.promise;
        };

        service.getSchema = function() {
          var deferred = $q.defer();
          if (schemaInformation) {
            deferred.resolve(schemaInformation);
          } else {
            inquireSchemaInformation().then(function(success){
              deferred.resolve(success);
            }, function(error){
              deferred.reject(error)
            });
          }
          return deferred.promise;
        };
        
        
        return service;
      });

      // Class NetConfServer
      mwtnCommonsApp.register.factory('NetConfServer', function() {
        // Classes
        // Class NetConfServer
        var NetConfServer = function(data) {
          this.data = data;
          this.getData = function() {
            return this.data;
          };
          this.getRadioSignalId = function() {
            return this.data.airInterfaceConfiguration.radioSignalId;
          };
          this.isLinkUp = function() {
            return this.data.airInterfaceStatus.linkIsUp;
          };
          this.isPowerOn = function() {
            return this.data.airInterfaceConfiguration.powerIsOn;
          };
          this.isActive = function() {
            return this.isPowerOn() && this.isLinkUp();
          };
        };
        return NetConfServer;
      });

      
      mwtnCommonsApp.register.factory('ActualNetworkElement', function($http, ENV) {

        // Classes
        // Class ActualNetworkElement
        var ActualNetworkElement = function(data) {
          this.data = data;
          this.data.layerProtocols = {};
          this.setOnfNetworkElement = function(onfNe) {
            this.data.onfNetworkElement = onfNe;
          };          
          this.getLpByRadioSignalId = function(radioSignalId) {
            //console.log('getLP', JSON.stringify(this.data.ltp));
            var layerProtocol;
            for (var layerProtocolKey in this.data.layerProtocols){
              if (this.data.layerProtocols[layerProtocolKey].getRadioSignalId && 
                  radioSignalId === parseInt(this.data.layerProtocols[layerProtocolKey].getRadioSignalId())) {
                layerProtocol = this.data.layerProtocols[layerProtocolKey];
              }
            }
            return layerProtocol;
          };
          this.getLpByRadioSignalIds = function(radioSignalIds) {
            //console.log('getLP', JSON.stringify(this.data.ltp));
            var layerProtocol;
            if (radioSignalIds !== undefined) {
            for (var layerProtocolKey in this.data.layerProtocols){
              if (this.data.layerProtocols[layerProtocolKey].getRadioSignalIds && 
                  radioSignalIds.toString() === this.data.layerProtocols[layerProtocolKey].getRadioSignalIds(this).toString()) {
                layerProtocol = this.data.layerProtocols[layerProtocolKey];
              }
            }}
            return layerProtocol;
          };
          this.setLP = function(onfPac) {
            this.data.layerProtocols[onfPac.data.layerProtocol] = onfPac;
          };
          this.getLpPac = function(lpRef) {
            return this.data.layerProtocols[lpRef];
          };
          this.getName = function() {
            return this.data.name;
          };
          this.getConnectionStatus = function() {
            return this.data.connectionStatus;
          };
          this.isConnected = function() {
            return this.data.name !== 'controller-config' && this.data.connectionStatus == 'connected';
          };
          this.setConnectionStatus = function(status) {
            this.data.connectionStatus = status;
          };
        };
        return ActualNetworkElement;
      });
      
      mwtnCommonsApp.register.factory('OnfNetworkElement', function() {
        // Classes
        // Class OnfNetworkElement
        var OnfNetworkElement = function(data) {
          this.data = data;
          this.getData = function() {
           return this.data;
          };
          this.getNumberOfLtps = function() {
            return this.data._ltpRefList.length;
          }
          this.getServerLtps = function(layerProtocolRef) {
            var result = [];
            var ltpList = this.data._ltpRefList.map(function(ltp){
              if (ltp._lpList[0].uuid === layerProtocolRef) {
                result =  ltp._serverLtpRefList;
              }
            });
            return result;
          };
          this.getClientLtpIds = function(layerProtocolRef) {
            var result = [];
            var ltpList = this.data._ltpRefList.map(function(ltp){
              if (ltp._lpList[0].uuid === layerProtocolRef) {
                result =  ltp._clientLtpRefList;
              }
            });
            return result;
          };
          this.getLpByLtpRef = function(ltpRef) {
            var result;
            var ltpList = this.data._ltpRefList.map(function(ltp){
              if (ltp.uuid === ltpRef) {
                result =  ltp._lpList[0];
              }
            });
            return result;
          };
          this.getLtpsByLayer = function(layerProtocolName) {
            var ltpList = this.data._ltpRefList.map(function(ltp){
              if (ltp._lpList[0].layerProtocolName === layerProtocolName) {
                return ltp;
              }
            });
            return ltpList.clean(null);
          };
          this.getLTPMwpsList = function() {
            return this.getLtpsByLayer('MWPS');
          };
          this.getLTPMwsList = function() {
            return this.getLtpsByLayer('MWS');
          };
          this.getLTPEthCtpList = function() {
            return this.getLtpsByLayer('ETH-CTP');
          };
        };
        return OnfNetworkElement;
      });

      mwtnCommonsApp.register.factory('MicrowavePhysicalSection', function() {
        // Classes
        // Class OnfNetworkElement
        var MicrowavePhysicalSection = function(data) {
          this.data = data;
          this.getData = function() {
           return this.data;
          };
          this.getLayerProtocolId = function() {
            return this.data.layerProtocol;
          };
          this.getRadioSignalId = function() {
            return this.data.airInterfaceConfiguration.radioSignalID;
          };
          this.isLinkUp = function() {
            return this.data.airInterfaceStatus.linkIsUp;
          };
          this.isPowerOn = function() {
            return this.data.airInterfaceConfiguration.powerIsOn;
          };
          this.isActive = function() {
            return this.isPowerOn() && this.isLinkUp();
          };
        };
        return MicrowavePhysicalSection;
      });

      mwtnCommonsApp.register.factory('MicrowaveSection', function() {
        // Classes
        // Class MicrowaveSection
        var MicrowaveSection = function(data) {
          this.data = data;
          this.getData = function() {
            return this.data;
          };
          this.getId = function() {
             return this.data.layerProtocol;
          };
          this.getRadioSignalIds = function(actualNe) {
            this.data.parent = actualNe;
            var result = [];
            var onfNe = actualNe.data.onfNetworkElement;
            var lpId = this.getId();
            onfNe.getServerLtps(lpId).map(function(mwpsLtpRef){
              var lpRef = onfNe.getLpByLtpRef(mwpsLtpRef).uuid;
              var mwps = actualNe.getLpPac(lpRef);
              result.push(mwps.getRadioSignalId());
            });
            return result;
          };
          this.getTimeSlotCapacity = function() {
            return this.data.structureCapability.timeSlotCapacity;
          };
          this.getTotalNumberOfTimeSlots = function() {
            return this.data.structureCapability.totalNumberOfTimeSlots;
          };
          this.getNumberOfEffectiveTimeSlots = function() {
            var count = 0;
            this.data.structureStatus.timeSlotStatusList.map(function(ts){
              if (ts.operationalStatus === 'ENABLED') {
                count = count + 1;
              }
            });
            return count;
          };
          this.getConfiguredCapacity = function() {
            return this.getTotalNumberOfTimeSlots() * this.getTimeSlotCapacity();
          };
          this.getEffectiveCapacity = function() {
            return this.getNumberOfEffectiveTimeSlots() * this.getTimeSlotCapacity();
          };
          this.isActive = function() {
            if (this.data.parent === undefined) {
              return false;
            }
            var actualNe = this.data.parent;
            var result = true;
            var onfNe = actualNe.data.onfNetworkElement;
            var lpId = this.getId();
            onfNe.getServerLtps(lpId).map(function(mwpsLtpRef){
              var lpRef = onfNe.getLpByLtpRef(mwpsLtpRef).uuid;
              var mwps = actualNe.getLpPac(lpRef);
              result = result && mwps.isActive();
            });
            return result;
          };
        };
        return MicrowaveSection;
      });     
    });
