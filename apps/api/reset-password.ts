import { db, users } from '@plexo/db';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

async function reset() {
    try {
        const password = 'password123456';
        const hash = await bcrypt.hash(password, 12);
        await db.update(users)
            .set({ passwordHash: hash })
            .where(eq(users.email, 'test@example.com'));
        console.log('Password reset successfully for test@example.com');
        process.exit(0);
    } catch (e) {
        console.error('Reset failed', e);
        process.exit(1);
    }
}
reset();
