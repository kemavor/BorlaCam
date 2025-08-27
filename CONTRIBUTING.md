# Contributing to BorlaCam

Thank you for your interest in contributing to BorlaCam! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- Docker & Docker Compose
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/borlacam.git
   cd borlacam
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate     # Windows
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements_production.txt
   pip install pytest pytest-cov flake8  # For testing
   ```

4. **Setup Frontend**
   ```bash
   cd front
   npm install
   npm run dev  # Start development server
   ```

5. **Start Backend**
   ```bash
   python production_api.py
   ```

## 🛠️ Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Development integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Your Changes**
   - Follow coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run backend tests
   pytest tests/ -v
   
   # Run frontend linting
   cd front && npm run lint
   
   # Test Docker build
   docker-compose build
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

## 📝 Coding Standards

### Python Code

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints where appropriate
- Maximum line length: 127 characters
- Use docstrings for functions and classes

```python
def detect_waste(image: np.ndarray, confidence: float = 0.25) -> List[Dict]:
    """
    Detect waste objects in an image.
    
    Args:
        image: Input image as numpy array
        confidence: Detection confidence threshold
        
    Returns:
        List of detection dictionaries
    """
    pass
```

### JavaScript/React Code

- Use ESLint configuration provided
- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names

```javascript
const WasteDetectionPanel = ({ onDetection, isActive }) => {
  const [predictions, setPredictions] = useState([]);
  
  const handleDetection = useCallback((result) => {
    setPredictions(result.predictions);
    onDetection(result);
  }, [onDetection]);
  
  return (
    <div className="detection-panel">
      {/* Component JSX */}
    </div>
  );
};
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Formatting changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add real-time confidence threshold adjustment
fix: resolve memory leak in webcam processing
docs: update API documentation with new endpoints
```

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_api.py -v
```

### Frontend Tests

```bash
cd front

# Lint code
npm run lint

# Build for production
npm run build
```

### Integration Tests

```bash
# Test full deployment
python deploy.py production false false  # Build only
docker-compose up -d
curl http://localhost:8000/health
```

## 📋 Pull Request Process

1. **Ensure CI Passes**
   - All tests must pass
   - Code must pass linting
   - Docker build must succeed

2. **Update Documentation**
   - Update README if needed
   - Add/update API documentation
   - Update deployment guides if necessary

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Tests added/updated
   - [ ] Manual testing completed
   - [ ] CI pipeline passes
   
   ## Deployment Notes
   Any special deployment considerations
   ```

4. **Review Process**
   - At least one review required
   - Address feedback promptly
   - Keep PR focused and small

## 🐛 Bug Reports

Use GitHub Issues with the bug report template:

```markdown
**Describe the Bug**
Clear description of the issue

**To Reproduce**
Steps to reproduce the behavior

**Expected Behavior**
What you expected to happen

**Environment**
- OS: [e.g. Windows 10]
- Python version: [e.g. 3.9]
- Docker version: [e.g. 20.10]
- Browser: [e.g. Chrome 91]

**Additional Context**
Screenshots, logs, or other context
```

## 💡 Feature Requests

Use GitHub Issues with the feature request template:

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches you've considered

**Additional Context**
Mockups, examples, or other context
```

## 🏷️ Release Process

Releases are automated through GitHub Actions:

1. **Version Bump**
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

2. **Automated Steps**
   - Docker image built and pushed
   - GitHub release created
   - Production assets packaged

3. **Manual Verification**
   - Test deployment from release assets
   - Verify Docker image functionality

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- Ask questions in GitHub Discussions
- Share knowledge and best practices

## 📞 Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Code Review** - Ask for feedback on your changes

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

- **Model Improvements** - Better accuracy, new waste categories
- **Performance Optimization** - Faster inference, lower memory usage
- **Mobile Support** - React Native app, responsive design
- **Cloud Deployment** - AWS/GCP/Azure templates
- **Documentation** - Tutorials, examples, translations
- **Testing** - Unit tests, integration tests, performance tests

Thank you for contributing to BorlaCam! 🎉