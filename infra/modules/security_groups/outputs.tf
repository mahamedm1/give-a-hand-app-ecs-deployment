output "alb_security_group_id" {
  description = "ID of ALB Security Group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of ECS Security Group"
  value       = aws_security_group.ecs.id
}

