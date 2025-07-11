angular
  .module('controllers')
  .controller('ExportFeedbackCtrl', function(
    $log,
    $scope,
    DB,
    Export
  ) {
    'use strict';
    'ngInject';

    const MESSAGE_LIMIT = 120;

    const formattedMessage = function(msg) {
      const suffix = msg.length > MESSAGE_LIMIT ? '...' : '';
      return msg.substring(0, MESSAGE_LIMIT) + suffix;
    };

    const safeStringify = function(str) {
      if (typeof str === 'string') {
        // User typed feedback
        return str;
      }
      try {
        // Pouchdb automated log; can be massive hence the limit
        str.message = formattedMessage(str.message);
        return JSON.stringify(str);
      } catch (e) {
        $log.warn('Error when stringifying message', e);
        return str;
      }
    };

    const mapFeedback = function(data) {
      const result = {
        page: {
          number: data.rows.length,
          total: data.total_rows,
        },
      };
      result.items = data.rows.map(function(row) {
        return {
          id: row.doc._id,
          time: row.doc.meta.time,
          info: safeStringify(row.doc.info),
        };
      });
      return result;
    };

    DB({ usersMeta: true })
      .query('users-meta/feedback_by_date', {
        include_docs: true,
        descending: true,
        limit: 20,
        reduce: false
      })
      .then(function(data) {
        $scope.feedback = mapFeedback(data);
      })
      .catch(function(err) {
        return $log.error('Error fetching feedback', err);
      });

    $scope.export = function() {
      if ($scope.exporting) {
        return;
      }

      $scope.exporting = true;
      Export('feedback')
        .finally(() => {
          $scope.exporting = false;
          $scope.$apply();
        });
    };
  });
