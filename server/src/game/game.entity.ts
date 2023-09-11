import {
	Table,
	Column,
	Model,
	DataType,
	BelongsToMany,
	PrimaryKey,
	AutoIncrement,
} from 'sequelize-typescript';
import { User } from 'src/user/user.entity';
import { UserGame } from 'src/user-game/user-game.entity';
import { Modifier } from 'src/modifier/modifier.entity';

@Table({ tableName: 'Game' })
export class Game extends Model<Game> {
	@PrimaryKey
	@AutoIncrement
	@Column({
		type: DataType.UUID,
		defaultValue: DataType.UUIDV4,
	})
	id: string;

	@Column({
		type: DataType.BOOLEAN,
		allowNull: false,
	})
	isRanked: boolean;

	@Column({
		type: DataType.ENUM(
			'ongoing',
			'finished',
			'abandoned',
			'waiting',
			'invitation',
		),
		allowNull: false,
	})
	status: string;

	@BelongsToMany(() => User, () => UserGame)
	users: User[];

	@BelongsToMany(() => Modifier, 'GameModifierBridge', 'gameId', 'modifierId')
	modifiers: Modifier[];
}
