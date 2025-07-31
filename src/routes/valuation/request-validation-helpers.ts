import { FastifyReply } from 'fastify';

export function validateVrm(vrm: string, reply: FastifyReply): boolean {
  if (!vrm || vrm.length > 7) {
    reply
      .code(400)
      .send({ message: 'vrm must be 7 characters or less', statusCode: 400 });
    return false;
  }
  return true;
}

export function validateMileage(
  mileage: number | null | undefined,
  reply: FastifyReply
): boolean {
  if (mileage == null || mileage <= 0) {
    reply
      .code(400)
      .send({ message: 'mileage must be a positive number', statusCode: 400 });
    return false;
  }
  return true;
}