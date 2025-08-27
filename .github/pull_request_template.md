# Pull Request

## Description

Brief description of the changes introduced by this PR.

Fixes # (issue number, if applicable)

## Type of Change

Please delete options that are not relevant:

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Test improvements
- [ ] CI/CD improvements
- [ ] Dependency update

## Changes Made

### Backend Changes
- [ ] Modified API endpoints
- [ ] Updated model inference logic
- [ ] Changed configuration handling
- [ ] Updated dependencies
- [ ] Other: _describe_

### Frontend Changes
- [ ] Added new React components
- [ ] Modified existing components
- [ ] Updated styling/CSS
- [ ] Changed API integration
- [ ] Updated dependencies
- [ ] Other: _describe_

### Infrastructure Changes
- [ ] Updated Docker configuration
- [ ] Modified deployment scripts
- [ ] Changed CI/CD pipeline
- [ ] Updated documentation
- [ ] Other: _describe_

## Testing Checklist

### Automated Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Code coverage maintained or improved
- [ ] Linting passes (Python: flake8, JavaScript: ESLint)

### Manual Testing
- [ ] Tested locally with development setup
- [ ] Tested Docker build and deployment
- [ ] Tested API endpoints with Postman/curl
- [ ] Tested frontend functionality in browser
- [ ] Tested on multiple browsers (if frontend changes)
- [ ] Tested on different screen sizes (if UI changes)

### Performance Testing
- [ ] No significant performance regression
- [ ] Memory usage remains acceptable
- [ ] API response times are reasonable
- [ ] Docker image size impact assessed

## Deployment Considerations

### Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes documented below
- [ ] Migration guide provided (if needed)
- [ ] Version bump required

### Configuration Changes
- [ ] No configuration changes required
- [ ] New environment variables added (documented below)
- [ ] Configuration migration needed

### Database/Model Changes
- [ ] No model changes
- [ ] New model version (path and compatibility noted below)
- [ ] Data migration required

## Documentation Updates

- [ ] README.md updated (if needed)
- [ ] API documentation updated
- [ ] Deployment guide updated
- [ ] Code comments added/updated
- [ ] CHANGELOG.md updated

## Screenshots/Demo

<!-- If applicable, add screenshots or demo videos to help explain your changes -->

### Before
<!-- Screenshot/description of behavior before changes -->

### After
<!-- Screenshot/description of behavior after changes -->

## Additional Notes

### Breaking Changes Details
<!-- If this PR introduces breaking changes, describe them here -->

### New Environment Variables
```bash
# Add any new environment variables here with descriptions
NEW_VARIABLE=default_value  # Description of what this variable does
```

### Migration Notes
<!-- Any special steps needed for existing deployments -->

### Performance Impact
<!-- Describe any performance implications -->

### Security Considerations
<!-- Any security implications of these changes -->

---

## Reviewer Checklist

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Code is well-commented and self-documenting
- [ ] No obvious bugs or security issues
- [ ] Error handling is appropriate
- [ ] Performance impact is acceptable

### Testing
- [ ] Adequate test coverage for new code
- [ ] Tests are meaningful and well-written
- [ ] Manual testing completed by reviewer
- [ ] Edge cases considered

### Documentation
- [ ] Public APIs are documented
- [ ] Complex logic is explained
- [ ] Deployment impact documented
- [ ] User-facing changes documented

### Deployment
- [ ] Docker build succeeds
- [ ] No security vulnerabilities introduced
- [ ] Dependencies are appropriate and up-to-date
- [ ] Configuration changes are backward compatible (or migration provided)

---

By submitting this PR, I confirm that:
- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes