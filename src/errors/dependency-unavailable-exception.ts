export class DependencyUnavailableException extends Error {
  constructor(message: string = 'Dependency is unavailable') {
    super(message);
    this.name = 'DependencyUnavailableException';
  }
}