import dns from 'dns';

// Override DNS resolvers
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
console.log('🌐 DNS servers set to:', dns.getServers());

// Test SRV lookup
console.log('Testing SRV lookup for MongoDB Atlas...');
dns.resolveSrv('_mongodb._tcp.igi-smtp.demytkv.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('❌ SRV resolution failed:', err.message);
    console.error('Code:', err.code);
  } else {
    console.log('✅ SRV resolution succeeded!');
    console.log('Records:', addresses);
  }

  // Also test direct hostname
  console.log('\nTesting direct hostname resolution...');
  dns.resolve4('ac-kjoshmj-shard-00-00.demytkv.mongodb.net', (err2, addrs) => {
    if (err2) {
      console.error('❌ Direct hostname failed:', err2.message);
    } else {
      console.log('✅ Direct hostname succeeded:', addrs);
    }

    // Test MongoDB Atlas general domain
    console.log('\nTesting mongodb.com domain...');
    dns.resolve4('mongodb.com', (err3, addrs3) => {
      if (err3) {
        console.error('❌ mongodb.com failed:', err3.message);
      } else {
        console.log('✅ mongodb.com succeeded:', addrs3);
      }
    });
  });
});