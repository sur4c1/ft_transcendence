import {
	Injectable,
	CanActivate,
	ExecutionContext,
	HttpStatus,
	HttpException,
	Inject,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';

/**
 * This guard is used to check if the user has the clearance needed to access
 * the route.
 */
@Injectable()
export class UserClearanceGuard implements CanActivate {
	constructor(
		@Inject(AuthService)
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const cookies = context.switchToHttp().getRequest().cookies;
		let clearance = 0;
		if (cookies.token) {
			const user = await this.authService.verify(cookies.token);
			if (!user)
				throw new HttpException('User Not Found', HttpStatus.NOT_FOUND);
			clearance = user.clearance;
		} else throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		if (clearance < Number(process.env.USER_CLEARANCE)) {
			throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
		}
		return true;
	}
}
