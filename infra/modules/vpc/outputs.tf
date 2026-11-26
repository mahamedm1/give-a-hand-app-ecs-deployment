output "vpc_id" {
  description = "ID for the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "ID for the Public Subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "ID for the Private Subnets"
  value       = aws_subnet.private[*].id
}


output "default_route_table_id" {
  description = "ID for the Route Table"
  value       = aws_route_table.default[*].id
}

output "nat_route_table_id" {
  description = "ID for the Route Table"
  value       = aws_route_table.nat[*].id
}


