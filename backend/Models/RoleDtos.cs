using System;
using System.Collections.Generic;

namespace SaasPos.Backend.Models
{
    public class RoleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public List<string> Permissions { get; set; } = new();
    }

    public class UpdateRolePermissionsRequest
    {
        public List<string> PermissionCodes { get; set; }
    }
}
