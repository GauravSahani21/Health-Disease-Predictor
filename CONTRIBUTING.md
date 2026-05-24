# Contributing to Health Disease Predictor & Advisor

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Medical accuracy is paramount - all medical logic must be reviewed by healthcare professionals

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Development Setup

```bash
# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start development environment
docker-compose -f docker-compose.dev.yml up
```

## Project Structure

- `/backend` - Node.js/Express API
- `/frontend` - React SPA
- `/ml_text` - Text ML service (FastAPI)
- `/ml_image` - Image ML service (FastAPI)
- `/infra` - Deployment configurations
- `/docs` - Documentation

## Coding Standards

### Backend (Node.js)
- Use ES6+ features
- Follow Airbnb style guide
- Add JSDoc comments for functions
- Write tests for new routes
- Run `npm run lint` before committing

### Frontend (React)
- Use functional components with hooks
- Follow React best practices
- Use Tailwind CSS for styling
- Write component tests
- Run `npm run lint` before committing

### ML Services (Python)
- Follow PEP 8 style guide
- Add docstrings for all functions
- Type hints for function signatures
- Write unit tests
- Run `pytest` before committing

## Testing

All new features must include tests:

```bash
# Run all tests
./scripts/test.sh

# Run specific service tests
cd backend && npm test
cd frontend && npm test
cd ml_text && pytest
cd ml_image && pytest
```

## Pull Request Process

1. **Branch naming**: 
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Documentation: `docs/description`

2. **Commit messages**:
   - Use clear, descriptive messages
   - Reference issues: `Fixes #123`
   - Format: `type: description`
     - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

3. **PR Description**:
   - Describe what changes were made
   - Link related issues
   - Include screenshots for UI changes
   - List testing performed

4. **Checklist**:
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Lint checks pass
   - [ ] No merge conflicts
   - [ ] Medical logic reviewed (if applicable)

## Medical Content Guidelines

**CRITICAL**: Any changes to medical logic, thresholds, or advice must be reviewed by qualified healthcare professionals.

Areas requiring medical review:
- Severity thresholds (`backend/routes/predict.js`)
- Medical advice templates
- Condition classifications
- Lab value interpretations

## Documentation

Update documentation for:
- New API endpoints (in `docs/API_SPEC.md`)
- Configuration changes
- New features
- Breaking changes

## Questions?

- Check existing documentation in `/docs`
- Open an issue for discussion
- Ask in pull request comments

## License

By contributing, you agree that your contributions will be licensed under the project's license.

Thank you for contributing to making healthcare more accessible!
