const { Sequelize } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  const BannedUser = sequelize.define('banneduser', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    chatRoomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
  }, {
      tableName: 'bannedusers',
  });
  return BannedUser;
};