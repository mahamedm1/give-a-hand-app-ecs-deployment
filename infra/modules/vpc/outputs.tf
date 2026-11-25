output "vpc_id" {
  description = "ID for the VPC"
  value       = aws_vpc.main.id
}

output "subnet_ids" {
  description = "ID for the Subnets"
  value       = aws_subnet.public[*].id
}

output "route_table_id" {
  description = "ID for the Route Table"
  value       = aws_route_table.main.id
}

