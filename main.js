var request = require('request');
var knex = require('knex');
var xml2js = require('xml2js');
var progress = require('progress');
var colors = require('colors');
var cheerio = require('cheerio');

db = knex({
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'root',
    password : 'root',
    database : 'paginegialle', 
    //debug    : true
  }
});

var sources;
var businesses = [];
var i, r = 0;
var bar;

// request('http://www.paginegialle.it/sitemap.xml', function (error, response, body) {
//   xml2js.parseString(body, function (err, result) {
//     sources = result.sitemapindex.sitemap;
//     sources = sources.filter(function(source) {
//       return source.loc[0].indexOf('visual') < 0;
//     }).map(function(source) {
//       return source.loc[0];
//     });
//   });

//   fetchSources();
// });

function fetchSources() {
  console.log('\nFetching tree sources'.red);
  bar = new progress('[:bar] :current/:total :etas', {
    total: sources.length, 
    width: 50
  });
  
  fetchSource(0, sources, function(businesses) {
    insertBusinessStubs(businesses);
  });
}

function fetchSource(i, sources, done) {
  bar.tick();

  var trunk = [];
  var url = sources[i];
  request(url, function (error, response, body) {
    xml2js.parseString(body, function (err, result) {
      trunk = result.urlset.url;
      trunk = trunk.map(function(business) {
        return business.loc[0];
      });
    });

    businesses = businesses.concat(trunk);
    if(i < sources.length - 1) {
      i ++;
      fetchSource(i, sources, done);
    } else {
      done(businesses)
    }
  });
}

function insertBusinessStubs(businesses) {
  console.log('\nInserting business urls'.red);
  bar = new progress('[:bar] :current/:total :etas', {
    total: businesses.length, 
    width: 50
  });

  function insert(done) {
    var url = businesses[r];

    db.insert({url: url}).into('businesses').then(function() {
      bar.tick();

      if(r < businesses.length - 1) {
        r ++;
        insert(done);
      } else {
        done();
      }
    });
  }

  insert(function() {
    console.log('done!')
  });
}

function fetchBusiness(i, businesses, done) {
  var business = {};

  request(url, function (error, response, body) {
    var $ = cheerio.load(body);
    var addressContainer = $('.indirizzo');
    business.title = $(addressContainer).find('h1').text();
    business.owner = $(addressContainer).find('.insegna').text();
    business.address = $(addressContainer).find('.street-address').text();
    business.locality = $(addressContainer).find('.locality').text();
    business.telephone = $(addressContainer).find('.tel').text();
    business.categories = $(addressContainer).find('.cat-principale a').text();
    business.website = $(addressContainer).find('.web-contatti a.sito').attr('href');
    var meta = $('.dettagli dl dt');
    business.meta = meta.map(function(i, _meta) {
      return {
        field: $(_meta).text(), 
        value: $(_meta).next().text()
      }
    }).get();

    storeBusiness(business);

    if(i < businesses.length - 1) {
      i ++;
      fetchBusiness(i, businesses, done);
    } else {
      done(businesses)
    }
  });
}

function storeBusiness(business) {
  
}

fetchBusiness('http://www.paginegialle.it/torselloalessandro');
