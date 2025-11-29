# Claude AI Project Rules - Mobinogi Web

This directory contains Claude AI project rules and configuration files organized for development efficiency and security.

## 📁 Directory Structure

### 🌍 Public Project Rules (`/project/`)
These files are safe to commit to version control and can be shared publicly:

- **`architecture-overview.md`** - Complete project architecture, technology stack, and integration points
- **`backend-development-guide.md`** - Spring Boot development guidelines, coding standards, and best practices
- **`frontend-development-guide.md`** - React/TypeScript development patterns and component architecture

### 🔒 Private Configuration (`/local/`)
These files contain sensitive information and are **gitignored**:

- **`environment-configuration.md`** - Database credentials, OAuth2 secrets, JWT keys, and environment variables
- **`deployment-secrets.md`** - Production deployment configuration, SSL certificates, and server security setup

## 🚀 Quick Navigation

### For Development Tasks:
- **Setting up environment**: → `local/environment-configuration.md`
- **Backend API development**: → `project/backend-development-guide.md`
- **Frontend component creation**: → `project/frontend-development-guide.md`
- **Understanding project architecture**: → `project/architecture-overview.md`
- **Production deployment**: → `local/deployment-secrets.md`

### For Specific Topics:
- **Database setup**: → `local/environment-configuration.md#database-configuration`
- **OAuth2 configuration**: → `local/environment-configuration.md#google-oauth2-setup`
- **Docker deployment**: → `local/deployment-secrets.md#docker-production-secrets`
- **Security hardening**: → `local/deployment-secrets.md#security-hardening`
- **Error handling**: → `project/backend-development-guide.md#api-development-rules`
- **Component patterns**: → `project/frontend-development-guide.md#react-component-patterns`

## ⚠️ Security Notes

### Gitignored Files
The `.claude/local/` directory is added to `.gitignore` to prevent sensitive information from being committed:

```gitignore
### Claude AI Rules - Local/Private ###
.claude/local/
```

### What's Safe to Share:
- ✅ Project structure and architecture
- ✅ Development guidelines and best practices
- ✅ Code patterns and examples
- ✅ Build and deployment processes (without secrets)
- ✅ Testing strategies and frameworks

### What Should Stay Private:
- ❌ Database credentials and connection strings
- ❌ OAuth2 client secrets and API keys
- ❌ JWT secrets and encryption keys
- ❌ SSL certificates and private keys
- ❌ Production server configurations
- ❌ Third-party service credentials

## 🔧 Getting Started

### 1. Initial Setup
```bash
# Copy environment templates
cp .claude/local/environment-configuration.md.template .claude/local/environment-configuration.md

# Fill in your actual credentials
# Edit .claude/local/environment-configuration.md with real values
```

### 2. Development Workflow
1. Read the appropriate guide based on your task
2. Follow the established patterns and conventions
3. Update documentation when making significant changes
4. Keep sensitive information in local files only

### 3. Team Collaboration
- Share `project/` files with team members
- Keep `local/` files private and don't share credentials
- Use environment variable templates for new team members
- Document any new patterns in the appropriate guide files

## 📋 File Overview

| File | Purpose | Public | Contains Secrets |
|------|---------|--------|------------------|
| `project/architecture-overview.md` | Project structure and technology overview | ✅ Yes | ❌ No |
| `project/backend-development-guide.md` | Spring Boot development patterns | ✅ Yes | ❌ No |
| `project/frontend-development-guide.md` | React/TypeScript development patterns | ✅ Yes | ❌ No |
| `local/environment-configuration.md` | Environment setup and secrets | ❌ No | ✅ Yes |
| `local/deployment-secrets.md` | Production deployment and security | ❌ No | ✅ Yes |

## 🔄 Maintenance

### Regular Updates
- Keep development guides updated with new patterns
- Update environment templates when adding new services
- Review and rotate secrets regularly
- Update deployment procedures as infrastructure changes

### Adding New Rules
1. Determine if the content contains sensitive information
2. Place in appropriate directory (`project/` or `local/`)
3. Update this README with navigation links
4. Follow established file naming conventions (kebab-case)

## 🤝 Contributing

When contributing to these rules:

1. **For public content**: Update files in `project/` directory
2. **For private content**: Update templates in `local/` directory
3. **Always remove sensitive data** before committing
4. **Test instructions** with a fresh environment setup
5. **Update navigation links** in this README

## 🆘 Help & Support

If you need help with:
- **Development setup**: Check `local/environment-configuration.md`
- **Coding questions**: Refer to appropriate development guide
- **Deployment issues**: See `local/deployment-secrets.md`
- **Architecture decisions**: Review `project/architecture-overview.md`

For questions not covered in these guides, consider:
1. Checking the main project documentation
2. Asking in team chat/Slack
3. Creating an issue in the project repository
4. Consulting the official technology documentation

---

*Last updated: $(date)*
*This structure separates public development guidance from private configuration to maintain security while enabling effective collaboration.*
