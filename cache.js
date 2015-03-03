module.exports = {
  create: function ( cacheId, path ) {
    var fs = require( 'fs' );
    var flatCache = require( 'flat-cache' );
    var cache = flatCache.load( cacheId, path );
    var assign = require('lodash.assign');
    var normalizedEntries = {};

    return {
      /**
       * Return the list o the files that changed compared
       * against the ones stored in the cache
       *
       * @method getUpdated
       * @param files {Array} the array of files to compare against the ones in the cache
       * @returns {Array}
       */
      getUpdatedFiles: function ( files ) {
        var me = this;
        files = files || [];

        return me.normalizeEntries( files ).filter( function ( entry ) {
          return entry.changed;
        }).map(function (entry) {
          return entry.key;
        });
      },

      /**
       * return the list of files
       * @method normalizeEntries
       * @param files
       * @returns {*}
       */
      normalizeEntries: function (files) {
        files = files || [];

        var nEntries = files.map(function (file) {
          var meta = cache.getKey(file);
          var cacheExists = !!meta;
          var fstat = fs.statSync(file);

          var cSize = fstat.size;
          var cTime = fstat.mtime.getTime();

          if (!meta) {
            meta = {
              size: cSize,
              mtime: cTime
            }
          }
          else {
            var isDifferentDate = cTime !== meta.mtime;
            var isDifferentSize = cSize !== meta.size;
          }

          var nEntry = normalizedEntries[file] = {
            key: file,
            changed : !cacheExists || isDifferentDate || isDifferentSize,
            meta: meta
          };

          return nEntry;

        });

        //normalizeEntries = nEntries;
        return nEntries;
      },

      /**
       * Remove an entry from the file-entry-cache. Useful to force the file to still be considered
       * modified the next time the process is run
       *
       * @method removeEntry
       * @param entryName
       */
      removeEntry: function (entryName) {
        delete normalizedEntries[entryName];
        cache.removeKey(entryName);
      },

      /**
       * Delete the cache file from the disk
       * @method deleteCacheFile
       */
      deleteCacheFile: function () {
        flatCache.clearCacheById(cacheId);
      },

      /**
       * Sync the files and persist them to the cache
       *
       * @method reconcile
       */
      reconcile: function () {
        var entries = normalizedEntries;

        var keys = Object.keys(entries);
        if (keys.length === 0) {
          return;
        }
        keys.forEach( function ( entryName ) {
          var cacheEntry = entries[entryName];
          var stat = fs.statSync( cacheEntry.key );

          var meta = assign(cacheEntry.meta, {
            size: stat.size,
            mtime: stat.mtime.getTime()
          });

          cache.setKey( entryName, meta );
        } );

        cache.save();
      }
    };
  }
};
