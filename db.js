const { Sequelize } = require('sequelize');

let sequelize;

const useSqlite = process.env.USE_SQLITE === 'true' || !process.env.DATABASE_URL;

if (useSqlite) {
  // Use SQLite for local development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging: false
  });
  console.log('Database: Using SQLite (db.sqlite)');
} else {
  // Use PostgreSQL for production (e.g. Render)
  // SSL is enforced by default. Set PG_SSL_REJECT_UNAUTHORIZED=false ONLY if your
  // managed provider does not expose its CA chain. Prefer providing PG_CA_CERT.
  const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false';
  const sslConfig = {
    require: true,
    rejectUnauthorized
  };
  if (process.env.PG_CA_CERT) {
    sslConfig.ca = process.env.PG_CA_CERT;
    sslConfig.rejectUnauthorized = true;
  }

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: { ssl: sslConfig },
    logging: false
  });
  console.log(
    `Database: Using PostgreSQL (DATABASE_URL, rejectUnauthorized=${sslConfig.rejectUnauthorized}${
      process.env.PG_CA_CERT ? ', custom CA' : ''
    })`
  );
}

// Define User model
const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fullname: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: Sequelize.STRING
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  avatar_url: {
    type: Sequelize.STRING,
    allowNull: true
  },
  failed_login_count: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  locked_until: {
    type: Sequelize.DATE,
    allowNull: true
  },
  token_version: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define Ad model
const Ad = sequelize.define('Ad', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  },
  title: {
    type: Sequelize.STRING
  },
  category: {
    type: Sequelize.STRING
  },
  price: {
    type: Sequelize.STRING
  },
  description: {
    type: Sequelize.TEXT
  },
  user_id: {
    type: Sequelize.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'service'
  },
  condition: {
    type: Sequelize.STRING,
    allowNull: true
  },
  trade_possible: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  price_type: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'fixed'
  },
  images: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  views: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'ads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define Relationships
User.hasMany(Ad, { foreignKey: 'user_id', as: 'ads' });
Ad.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Safe migration function to run before sync
async function syncDatabase() {
  const queryInterface = sequelize.getQueryInterface();

  const safeAddColumn = async (tableName, columnName, definition) => {
    try {
      await queryInterface.addColumn(tableName, columnName, definition);
      console.log(`[Migration] Column '${columnName}' successfully added to table '${tableName}'.`);
    } catch (err) {
      console.log(`[Migration] Column '${columnName}' in table '${tableName}' already exists or skipped: ${err.message}`);
    }
  };

  // User columns
  await safeAddColumn('users', 'avatar_url', {
    type: Sequelize.STRING,
    allowNull: true
  });
  await safeAddColumn('users', 'failed_login_count', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  });
  await safeAddColumn('users', 'locked_until', {
    type: Sequelize.DATE,
    allowNull: true
  });
  await safeAddColumn('users', 'token_version', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  });

  // Ad columns
  await safeAddColumn('ads', 'type', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'service'
  });
  await safeAddColumn('ads', 'condition', {
    type: Sequelize.STRING,
    allowNull: true
  });
  await safeAddColumn('ads', 'trade_possible', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
  await safeAddColumn('ads', 'price_type', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'fixed'
  });
  await safeAddColumn('ads', 'images', {
    type: Sequelize.TEXT,
    allowNull: true
  });
  await safeAddColumn('ads', 'views', {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  });

  // Run native sync
  await sequelize.sync();
  console.log('[Database] Sync completed successfully.');
}

module.exports = {
  sequelize,
  User,
  Ad,
  syncDatabase
};
