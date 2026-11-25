output "vpc_id"{
    description = "ID for the VPC"
    value = aws_vpc.main.id
}

output "subnet_ids"{
    description = "ID for the subnets"
    value = aws_subnet.main[*].id
}