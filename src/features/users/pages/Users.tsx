// Users.tsx

import React, {
  useState,
  useEffect,
} from "react";

import { useUsers } from "../hooks/useUsers";

import { fetchUsers } from "../api/userServices";

import { UserTable } from "../components/Table";

export interface User {
  id: string | number;
  name: string;
  email: string;
  location: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>(
    []
  );

  const {
    searchTerm,
    setSearchTerm,
    filteredAndSortedUsers,
    requestSort,
    sortConfig,
  } = useUsers(users);

  useEffect(() => {
    fetchUsers().then((data) => {
      setUsers(data as User[]);
    });
  }, []);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #CBD5E1",
            width: 280,
            maxWidth: "100%",
            outline: "none",
            fontSize: 14,
          }}
        />
      </div>

      {/* TABLE */}
      <UserTable
        data={filteredAndSortedUsers}
        onSort={requestSort}
        sortConfig={sortConfig}
        columns={[
          {
            label: "Name",
            key: "name",
          },
          {
            label: "Email",
            key: "email",
          },
          {
            label: "Location",
            key: "location",
          },
        ]}
      />
    </div>
  );
};

export default Users;